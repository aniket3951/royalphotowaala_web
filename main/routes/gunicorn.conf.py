import os

workers = 4
worker_class = 'gevent'
bind = '0.0.0.0:' + str(int(os.environ.get('PORT', 10000)))
timeout = 120
keepalive = 5
