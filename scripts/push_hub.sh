#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "datanimbus.io.ne :: Pushing Image to Docker Hub :: appveen/datanimbus.io.ne:$TAG"
echo "****************************************************"

docker tag datanimbus.io.ne:$TAG appveen/datanimbus.io.ne:$TAG
docker push appveen/datanimbus.io.ne:$TAG

echo "****************************************************"
echo "datanimbus.io.ne :: Image Pushed to Docker Hub AS appveen/datanimbus.io.ne:$TAG"
echo "****************************************************"