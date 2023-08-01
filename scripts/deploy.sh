#!/bin/bash

set -e

TAG=`cat CURRENT_NE`


echo "****************************************************"
echo "datanimbus.io.ne :: Deploying Image in K8S :: $NAMESPACE"
echo "****************************************************"

kubectl set image deployment/ne ne=$ECR_URL/datanimbus.io.ne:$TAG -n $NAMESPACE --record=true


echo "****************************************************"
echo "datanimbus.io.ne :: Image Deployed in K8S AS $ECR_URL/datanimbus.io.ne:$TAG"
echo "****************************************************"