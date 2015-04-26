#!/usr/bin/python3

from autobahn.asyncio.websocket import WebSocketServerProtocol, WebSocketServerFactory
import json
import time

VERSION=1
PORT=3904

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

active_clients = []
active_offers = []
active_games = []

def find_user(handle):
    for client in active_clients:
        if client.handle == handle:
            return client
    return None

class Offer:
    def __init__(self,by,to):
        self.by = by
        self.to = to

class DiamondGoProtocol(WebSocketServerProtocol):

    def send_json(self, obj):
        self.sendMessage(json.dumps(obj,ensure_ascii=False).encode('utf-8'),isBinary=False)

    def do_offers(self,command):
        o = { 
            't' : 'offers',
            'users' : [x.by.identity for x in active_offers if x.to == self]
            }
        self.send_json(o)

    def do_users(self,command):
        o = { 
            't' : 'user_list',
            'users' : [x.identity for x in active_clients]
            }
        self.send_json(o)

    def do_propose(self,command):
        global active_offers
        user = find_user(command['user']['handle'])
        print("Propose: {0} proposes game to {1}".format(self.identity['handle'],command['user']['handle']))
        if not user:
            return
        # remove other offers from this user
        updates = set([x.to for x in active_offers if x.by == self])
        updates.add(self)
        updates.add(user)
        active_offers = [x for x in active_offers if x.by != self]
        # add new offer
        offer = Offer(self,user)
        active_offers.append(offer)
        # send updated offer list to all changed parties
        for u in updates:
            u.do_offers(None)
        print("Proposed: {0} proposes game to {1}".format(self.identity['handle'],user.identity['handle']))

    def do_hello(self,command):
        #TODO: disallow duplicate handles
        self.handle = command['handle']
        self.identity = { 'handle': self.handle, 'addr': self.addr } 
        self.send_json( {
            't' : 'hello_ack',
            'id' : self.identity,
            } )
        print("Login: {0} at {1}".format(self.handle, time.asctime()))
        # update other clients
        for client in active_clients:
            if client != self:
                client.do_users(None)


    handlers = {
            'hello' : do_hello,
            'users' : do_users,
            'propose_game' : do_propose,
            }

    def onConnect(self,info):
        self.identity = None
        self.addr = info.peer

    def onOpen(self):
        active_clients.append(self)

    def onClose(self,wasClean,code,reason):
        try:
            active_clients.remove(self)
        except:
            pass
        print("Closed: {0} at {1} for {2}".format(self.handle,time.asctime(),reason))
    
    def onMessage(self, payload, isBinary):
        try:
            obj = json.loads(payload.decode())
            handler = DiamondGoProtocol.handlers[obj['t']]
            handler(self,obj)
        except Exception as e:
            print(e)

    def check_ident(self):
        if not self.identity:
            raise NotIdentified()

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

