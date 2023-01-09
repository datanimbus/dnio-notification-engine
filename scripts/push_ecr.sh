#!/bin/bash

set -e

TAG=`cat CURRENT_NE`


echo "****************************************************"
echo "data.stack:ne :: Pushing Image to ECR :: $ECR_URL/data.stack.ne:$TAG"
echo "****************************************************"

$(aws ecr get-login --no-include-email)
docker tag data.stack.ne:$TAG $ECR_URL/data.stack.ne:$TAG
docker push $ECR_URL/data.stack.ne:$TAG


echo "****************************************************"
echo "data.stack:ne :: Image pushed to ECR AS $ECR_URL/data.stack.ne:$TAG"
echo "****************************************************"