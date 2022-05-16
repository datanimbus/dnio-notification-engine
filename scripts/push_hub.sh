#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "data.stack:ne :: Pushing Image to Docker Hub :: appveen/data.stack.ne:$TAG"
echo "****************************************************"

docker tag data.stack.ne:$TAG appveen/data.stack.ne:$TAG
docker push appveen/data.stack.ne:$TAG

echo "****************************************************"
echo "data.stack:ne :: Image Pushed to Docker Hub AS appveen/data.stack.ne:$TAG"
echo "****************************************************"