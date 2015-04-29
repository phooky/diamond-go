#!/usr/bin/python3

from autobahn.asyncio.websocket import WebSocketServerProtocol, WebSocketServerFactory
import json
import time

VERSION=1
PORT=3904

from enum import Enum

# Summary of interactions:
# C1) Hello, I am X running Y.
# S1) Hi, X. You are supported.
# C2) Give me a list of users.
# S3) Okay, here are users [U1, U2...]
# C4) Goodbye.
# S4) Okay, Goodbye.
# C5) Give me a list of games.
# S5) Okay, here are games [G1, G2...]
# C6) Offer a game to Un.
# S6) Game offered, offer On.

# S7) Offer On has been accepted/declined/timed out. (Game is Gn)
# C7) Acknowledged.

class NotIdentified(Exception):
    pass

# Map of user ids to users
users = {}
# Map of game ids to games
games = {}
# List of outstanding offers
offers = []

class UserState(Enum):
    login = 0
    lobby = 1
    playing = 2
    watching = 3

class User:
    def __init__(self,handle,addr,protocol):
        self.handle = handle
        self.addr = addr
        self.status = UserState.login
        self.protocol = protocol
        self.desc = { 'id':id(self), 'handle':self.handle }
        users[id(self)] = self
        self.game = None

    def update_users_games(self):
        self.protocol.send_json( {
            't':'users_games',
            'users':[x.desc for x in users.values()],
            'games':[x.desc for x in games.values()],
            })

class Offer:
    def find(by, to):
        for offer in offers:
            if offer.by == by and offer.to == to:
                return offer
        return None

    def __init__(self,by,to):
        "Create an offer and send proposal message to target"
        self.by = by
        self.to = to
        offers.append(self)
        to.protocol.send_json( self.make_update('new') )

    def make_update(self,status):
        return { 't':'offer', 'by':self.by.desc, 'to':self.to.desc, 'status':status }

    def resolve(self, status):
        "Send offer resolution to both parties and remove from offers"
        self.to.protocol.send_json( self.make_update(status) )
        self.by.protocol.send_json( self.make_update(status) )
        offers.remove(self)

    def reject(self):
        self.resolve('rejected')

    def cancel(self):
        self.resolve('cancelled')

    def accept(self):
        self.resolve('accepted')
        # Start game
        print("starting game")
        game = Game(self.by,self.to)

class Game:
    def __init__(self,white,black):
        self.white = white
        self.black = black
        self.start = time.time()
        games[id(self)] = self
        self.moves = []
        self.watchers = set()
        self.subscribe(black)
        self.subscribe(white)

    def subscribe(self,watcher):
        if watcher not in self.watchers:
            self.watchers.add(watcher)
            watcher.protocol.send_json( { 't':'game', 'dsc':self.desc, 'moves':self.moves } )

    def unsubscribe(self,watcher):
        self.watchers.remove(watcher)

    @property
    def desc(self):
        return { 'id':id(self), 'white':self.white.desc, 'black':self.black.desc, 'start':self.start }

    def play_move(self,by,move):
        if (len(moves) % 2)  == 0:
            if by != self.black:
                raise Exception()
            elif by != self.white:
                raise Exception()
            else:
                raise Exception()
        self.moves.append(move)
        update = { 't':'game_upd', 'id':id(self), 'by':by.desc, 'move':move }
        for watcher in self.watchers:
            watcher.protocol.send_json(update)


class DiamondGoProtocol(WebSocketServerProtocol):

    def send_json(self, obj):
        self.sendMessage(json.dumps(obj,ensure_ascii=False).encode('utf-8'),isBinary=False)

    def do_hello_req(self,command):
        "Basic login"
        #TODO: disallow duplicate handles
        self.user = User(command['handle'],self.addr,self)
        self.send_json( {
            't' : 'hello',
            'id' : id(self.user),
            } )
        print("Login: {0} at {1}".format(self.user.handle, time.asctime()))
        # update self and others
        for user in users.values():
            user.update_users_games()

    def do_users_games_req(self,command):
        self.user.update_users_games()

    def do_make_offer(self,command):
        to = users[command['to']]
        by = self.user
        if Offer.find(by,to):
            raise Exception()
        offer = Offer(by,to)

    def do_offer_rsp(self,command):
        to = users[command['to']]
        by = users[command['by']]
        status = command['status']
        offer = Offer.find(by,to)
        if status == "accepted": 
            offer.accept()
        elif status == "rejected":
            offer.reject()

    def do_watch_game(self,command):
        pass

    def do_leave_game(self,command):
        pass

    def do_move(self,command):
        game_id = command["id"]
        move = command["move"]
        # send to all watchers
        game = games[game_id]
        for watcher in game.watchers:
            watcher.protocol.send_json( {
                't':'game_upd',
                'id':game_id,
                'move':move
                })
        pass

    handlers = {
            'hello_req' : do_hello_req,
            'users_games_req' : do_users_games_req,
            'make_offer' : do_make_offer,
            'offer_rsp' : do_offer_rsp,
            'watch_game' : do_watch_game,
            'leave_game' : do_leave_game,
            'move' : do_move,
            }

    def onConnect(self,info):
        self.user = None
        self.addr = info.peer

    def onOpen(self):
        pass

    def onClose(self,wasClean,code,reason):
        try:
            print("Close..")
            if self.user:
                # close all offers
                to_close = [offer for offer in offers if offer.by == self.user or offer.to == self.user]
                for offer in to_close:
                    offer.cancel()                        
                print("Leaves: {0} at {1} for {2}".format(self.user.handle,time.asctime(),reason))
                del users[id(self.user)]
                for user in users.values():
                    user.update_users_games()
            self.user = None
        except Exception as e:
            print(e)
            pass
    
    def onMessage(self, payload, isBinary):
        try:
            obj = json.loads(payload.decode())
            handler = DiamondGoProtocol.handlers[obj['t']]
            handler(self,obj)
        except Exception as e:
            print(e)


if __name__ == '__main__':
    import asyncio
    factory = WebSocketServerFactory("ws://127.0.0.1:{0}".format(PORT),debug=False)
    factory.protocol = DiamondGoProtocol

    loop = asyncio.get_event_loop()
    coro = loop.create_server(factory, '127.0.0.1', PORT)
    server = loop.run_until_complete(coro)
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()
        loop.close()

