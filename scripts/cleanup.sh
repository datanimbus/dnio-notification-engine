#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "data.stack:ne :: Cleaning Up Local Images :: $TAG"
echo "****************************************************"


docker rmi data.stack.ne:$TAG -f