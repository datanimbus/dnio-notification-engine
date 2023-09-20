#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "datanimbus.io.ne :: Pushing Image to Docker Hub :: datanimbus/datanimbus.io.ne:$TAG"
echo "****************************************************"

docker tag datanimbus.io.ne:$TAG datanimbus/datanimbus.io.ne:$TAG
docker push datanimbus/datanimbus.io.ne:$TAG

echo "****************************************************"
echo "datanimbus.io.ne :: Image Pushed to Docker Hub AS datanimbus/datanimbus.io.ne:$TAG"
echo "****************************************************"