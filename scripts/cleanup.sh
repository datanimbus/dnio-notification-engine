#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "datanimbus.io.ne :: Cleaning Up Local Images :: $TAG"
echo "****************************************************"


docker rmi datanimbus.io.ne:$TAG -f