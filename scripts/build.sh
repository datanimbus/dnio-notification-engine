#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "data.stack:ne :: Building NE using TAG :: $TAG"
echo "****************************************************"


docker build -t data.stack.ne:$TAG .


echo "****************************************************"
echo "data.stack:ne :: NE Built using TAG :: $TAG"
echo "****************************************************"


echo $TAG > LATEST_NE