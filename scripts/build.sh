#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "datanimbus.io.ne :: Building NE using TAG :: $TAG"
echo "****************************************************"

sed -i.bak s#__image_tag__#$TAG# Dockerfile

if $cleanBuild ; then
    docker build --no-cache -t datanimbus.io.ne:$TAG .
else 
    docker build -t datanimbus.io.ne:$TAG .
fi


echo "****************************************************"
echo "datanimbus.io.ne :: NE Built using TAG :: $TAG"
echo "****************************************************"


echo $TAG > LATEST_NE