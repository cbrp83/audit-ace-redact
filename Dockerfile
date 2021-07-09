FROM node:14

COPY *.json ./

RUN npm install

COPY *.js *.sh ./

RUN mkdir -p /IBM && chgrp -R 0 /IBM && chmod -R g=u /IBM && \
  mkdir -p /.mqm && chgrp -R 0 /.mqm && chmod -R g=u /.mqm

ENTRYPOINT exec node server.js -h $MQHOST -t $MQPORT -c $MQCHANNEL -m $QUEUEMANAGER -q $QUEUE -u $MQUSER -p $MQPASSWORD -a $API_KEY
