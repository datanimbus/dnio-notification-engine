#!/bin/bash
set -e
if [ -f $WORKSPACE/../TOGGLE ]; then
    echo "****************************************************"
    echo "odp:ne :: Toggle mode is on, terminating build"
    echo "odp:ne :: BUILD CANCLED"
    echo "****************************************************"
    exit 0
fi

cDate=`date +%Y.%m.%d.%H.%M` #Current date and time

if [ -f $WORKSPACE/../CICD ]; then
    CICD=`cat $WORKSPACE/../CICD`
fi
if [ -f $WORKSPACE/../ODP_RELEASE ]; then
    REL=`cat $WORKSPACE/../ODP_RELEASE`
fi
if [ -f $WORKSPACE/../DOCKER_REGISTRY ]; then
    DOCKER_REG=`cat $WORKSPACE/../DOCKER_REGISTRY`
fi
BRANCH='dev'
if [ -f $WORKSPACE/../BRANCH ]; then
    BRANCH=`cat $WORKSPACE/../BRANCH`
fi
if [ $1 ]; then
    REL=$1
fi
if [ ! $REL ]; then
    echo "****************************************************"
    echo "odp:ne :: Please Create file ODP_RELEASE with the releaese at $WORKSPACE or provide it as 1st argument of this script."
    echo "odp:ne :: BUILD FAILED"
    echo "****************************************************"
    exit 0
fi
TAG=$REL
if [ $2 ]; then
    TAG=$TAG"-"$2
fi
if [ $3 ]; then
    BRANCH=$3
fi
if [ $CICD ]; then
    echo "****************************************************"
    echo "odp:ne :: CICI env found"
    echo "****************************************************"
    TAG=$TAG"_"$cDate
    if [ ! -f $WORKSPACE/../ODP_NAMESPACE ]; then
        echo "****************************************************"
        echo "odp:ne :: Please Create file ODP_NAMESPACE with the namespace at $WORKSPACE"
        echo "odp:ne :: BUILD FAILED"
        echo "****************************************************"
        exit 0
    fi
    ODP_NS=`cat $WORKSPACE/../ODP_NAMESPACE`
fi

sh $WORKSPACE/scripts/prepare_yaml.sh $REL $2

echo "****************************************************"
echo "odp:ne :: Using build :: "$TAG
echo "****************************************************"

cd $WORKSPACE

echo "****************************************************"
echo "odp:ne :: Adding IMAGE_TAG in Dockerfile :: "$TAG
echo "****************************************************"
sed -i.bak s#__image_tag__#$TAG# Dockerfile

if [ -f $WORKSPACE/../CLEAN_BUILD_NE ]; then
    echo "****************************************************"
    echo "odp:ne :: Doing a clean build"
    echo "****************************************************"
    
    docker build --no-cache -t odp:ne.$TAG .
    rm $WORKSPACE/../CLEAN_BUILD_NE

    echo "****************************************************"
    echo "odp:ne :: Copying deployment files"
    echo "****************************************************"

    if [ $CICD ]; then
        sed -i.bak s#__docker_registry_server__#$DOCKER_REG# ne.yaml
        sed -i.bak s/__release_tag__/"'$REL'"/ ne.yaml
        sed -i.bak s#__release__#$TAG# ne.yaml
        sed -i.bak s#__namespace__#$ODP_NS# ne.yaml
        sed -i.bak '/imagePullSecrets/d' ne.yaml
        sed -i.bak '/- name: regsecret/d' ne.yaml

        kubectl delete deploy ne -n $ODP_NS || true # deleting old deployement
        kubectl delete service ne -n $ODP_NS || true # deleting old service
        #creating new deployment
        kubectl create -f ne.yaml
    fi

else
    echo "****************************************************"
    echo "odp:ne :: Doing a normal build"
    echo "****************************************************"
    docker build -t odp:ne.$TAG .
    if [ $CICD ]; then
        kubectl set image deployment/ne ne=odp:ne.$TAG -n $ODP_NS --record=true
    fi
fi
if [ $DOCKER_REG ]; then
    echo "****************************************************"
    echo "odp:ne :: Docker Registry found, pushing image"
    echo "****************************************************"

    docker tag odp:ne.$TAG $DOCKER_REG/odp:ne.$TAG
    docker push $DOCKER_REG/odp:ne.$TAG
fi
echo "****************************************************"
echo "odp:ne :: BUILD SUCCESS :: odp:ne.$TAG"
echo "****************************************************"
echo $TAG > $WORKSPACE/../LATEST_NE
