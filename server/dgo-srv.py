#!/usr/bin/python3

import socket
from threading import Thread, Event, Semaphore
import sys
import time
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

import json

class DiamondGoClient(Thread):
    def __init__(self,server,socket,addr):
        Thread.__init__(self)
        self.server = server
        self.sock = socket
        self.addr = addr
        self.identity = None

    def process(self,command):
        obj = json.loads(command)

    def error(self,message):
        self.reply( {
            'error' : message
            })

    def reply(self,obj):
        self.sock.send(json.dumps(obj).encode()+b'\n')

    def run(self):
        self.running = True
        dangling = b''
        self.sock.settimeout(4)
        while self.running:
            try:
                dangling = dangling + self.sock.recv(200)
                if len(dangling) > 10000:
                    # flood or worse; drop this client
                    self.running = False
                elif dangling.find(b'\n') != -1:
                    (command, dangling) = dangling.split(b'\n',1)
                    command = command.decode().strip()
                    try:
                        self.process(command)
                    except Exception as e:
                        sys.stderr.write("Could not process command {0}, {1}\n".format(command,e))
                        self.error("Could not parse command")
            except socket.timeout:
                pass
            finally:
                pass
        self.sock.close()
        sys.stdout.write("Closing socket.\n")
        self.server.remove(self)
            
class DiamondGoServer:
    def __init__(self,host="localhost",port=PORT):
        self.sock = socket.socket()
        self.sock.bind((host,port))
        self.active_clients = []
        self.client_sem = Semaphore()

    def remove(self,client):
        self.client_sem.acquire()
        try:
            self.active_clients.remove(client)
        except ValueError as v:
            sys.stderr.print("Trying to remove missing client")
        self.client_sem.release()

    def run(self):
        self.sock.listen(5)
        try:
            while True:
                insock,inaddr = self.sock.accept()
                client = DiamondGoClient(self,insock,inaddr)
                self.client_sem.acquire()
                self.active_clients.append(client)
                self.client_sem.release()
                client.start()
        except KeyboardInterrupt:
            print("Shutting down.")
        finally:
            self.client_sem.acquire()
            for c in self.active_clients: c.running = False
            self.client_sem.release()
            self.sock.close()

if __name__ == '__main__':
    srv = DiamondGoServer()
    srv.run()
    sys.stdout.write("done\n")
    time.sleep(5)
    sys.stdout.write("exiting.\n")

