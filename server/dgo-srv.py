#!/usr/bin/python3

from autobahn.asyncio.websocket import WebSocketServerProtocol, WebSocketServerFactory
from threading import Semaphore
import json

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
active_clients_sem = Semaphore()

class DiamondGoProtocol(WebSocketServerProtocol):

    def send_json(self, obj):
        self.sendMessage(json.dumps(obj,ensure_ascii=False).encode('utf-8'),isBinary=False)

    def do_hello(self,command):
        print("do hello")
        self.handle = command['handle']
        self.identity = { 'handle': self.handle, 'addr': self.addr } 
        self.send_json( {
            't' : 'hello_ack',
            'id' : self.identity,
            } )
        print("done hello")

    handlers = {
            'hello' : do_hello,
            }

    def onConnect(self,info):
        self.identity = None
        self.addr = info.peer
        #print("Connecting {0},{1}.".format(info,type(info)))
        #print(dir(self))

    def onOpen(self):
        active_clients_sem.acquire()
        active_clients.append(self)
        active_clients_sem.release()
        print("Opened.")

    def onClose(self,wasClean,code,reason):
        active_clients_sem.acquire()
        try:
            active_clients.remove(self)
        except:
            pass
        finally:
            active_clients_sem.release()
        print("Closed; {0} and {1}".format(code,reason))
    
    def onMessage(self, payload, isBinary):
        print("message {0} {1}".format(payload,isBinary))
        try:
            obj = json.loads(payload.decode())
            handler = DiamondGoProtocol.handlers[obj['t']]
            handler(self,obj)
            return "hello there ugh"
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

