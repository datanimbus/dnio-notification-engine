#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "data.stack:ne :: Saving Image to AWS S3 :: $S3_BUCKET/stable-builds"
echo "****************************************************"

TODAY_FOLDER=`date ++%Y_%m_%d`

docker save -o data.stack.ne_$TAG.tar data.stack.ne:$TAG
bzip2 data.stack.ne_$TAG.tar
aws s3 cp data.stack.ne_$TAG.tar.bz2 s3://$S3_BUCKET/stable-builds/$TODAY_FOLDER/data.stack.ne_$TAG.tar.bz2
rm data.stack.ne_$TAG.tar.bz2

echo "****************************************************"
echo "data.stack:ne :: Image Saved to AWS S3 AS data.stack.ne_$TAG.tar.bz2"
echo "****************************************************"