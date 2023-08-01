#!/bin/bash

set -e

echo "****************************************************"
echo "datanimbus.io.ne :: Copying yaml file "
echo "****************************************************"
if [ ! -d yamlFiles ]; then
    mkdir yamlFiles
fi

TAG=`cat CURRENT_NE`

rm -rf yamlFiles/ne.*
cp ne.yaml yamlFiles/ne.$TAG.yaml
cd yamlFiles/
echo "****************************************************"
echo "datanimbus.io.ne :: Preparing yaml file "
echo "****************************************************"

sed -i.bak s/__release__/$TAG/ ne.$TAG.yaml

echo "****************************************************"
echo "datanimbus.io.ne :: yaml file saved"
echo "****************************************************"