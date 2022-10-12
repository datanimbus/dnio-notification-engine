#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "data.stack:ne :: Building NE using TAG :: $TAG"
echo "****************************************************"

sed -i.bak s#__image_tag__#$TAG# Dockerfile

if $cleanBuild ; then
    docker build --no-cache -t data.stack.ne:$TAG .
else 
    docker build -t data.stack.ne:$TAG .
fi


echo "****************************************************"
echo "data.stack:ne :: NE Built using TAG :: $TAG"
echo "****************************************************"


echo $TAG > LATEST_NE