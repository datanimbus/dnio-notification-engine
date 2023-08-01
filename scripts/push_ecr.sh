#!/bin/bash

set -e

TAG=`cat CURRENT_NE`


echo "****************************************************"
echo "datanimbus.io.ne :: Pushing Image to ECR :: $ECR_URL/datanimbus.io.ne:$TAG"
echo "****************************************************"

$(aws ecr get-login --no-include-email)
docker tag datanimbus.io.ne:$TAG $ECR_URL/datanimbus.io.ne:$TAG
docker push $ECR_URL/datanimbus.io.ne:$TAG


echo "****************************************************"
echo "datanimbus.io.ne :: Image pushed to ECR AS $ECR_URL/datanimbus.io.ne:$TAG"
echo "****************************************************"