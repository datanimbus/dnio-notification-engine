#!/bin/bash

set -e

TAG=`cat CURRENT_NE`


echo "****************************************************"
echo "data.stack:ne :: Deploying Image in K8S :: $NAMESPACE"
echo "****************************************************"

kubectl set image deployment/ne ne=$ECR_URL/data.stack.ne:$TAG -n $NAMESPACE --record=true


echo "****************************************************"
echo "data.stack:ne :: Image Deployed in K8S AS $ECR_URL/data.stack.ne:$TAG"
echo "****************************************************"