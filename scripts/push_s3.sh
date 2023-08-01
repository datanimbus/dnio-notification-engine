#!/bin/bash

set -e

TAG=`cat CURRENT_NE`

echo "****************************************************"
echo "datanimbus.io.ne :: Saving Image to AWS S3 :: $S3_BUCKET/stable-builds"
echo "****************************************************"

TODAY_FOLDER=`date ++%Y_%m_%d`

docker save -o datanimbus.io.ne_$TAG.tar datanimbus.io.ne:$TAG
bzip2 datanimbus.io.ne_$TAG.tar
aws s3 cp datanimbus.io.ne_$TAG.tar.bz2 s3://$S3_BUCKET/stable-builds/$TODAY_FOLDER/datanimbus.io.ne_$TAG.tar.bz2
rm datanimbus.io.ne_$TAG.tar.bz2

echo "****************************************************"
echo "datanimbus.io.ne :: Image Saved to AWS S3 AS datanimbus.io.ne_$TAG.tar.bz2"
echo "****************************************************"