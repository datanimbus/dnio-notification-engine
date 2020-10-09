#!/bin/bash

echo "****************************************************"
echo "odp:ne :: Copying yaml file "
echo "****************************************************"
if [ ! -d $WORKSPACE/../yamlFiles ]; then
    mkdir $WORKSPACE/../yamlFiles
fi

REL=$1
if [ $2 ]; then
    REL=$REL-$2
fi

rm -rf $WORKSPACE/../yamlFiles/ne.*
cp $WORKSPACE/ne.yaml $WORKSPACE/../yamlFiles/ne.$REL.yaml
cd $WORKSPACE/../yamlFiles/
echo "****************************************************"
echo "odp:ne :: Preparing yaml file "
echo "****************************************************"
sed -i.bak s/__release_tag__/"'$1'"/ ne.$REL.yaml
sed -i.bak s/__release__/$REL/ ne.$REL.yaml