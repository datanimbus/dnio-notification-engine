#!/bin/bash
set -e
if [ -f $WORKSPACE/../TOGGLE ]; then
    echo "****************************************************"
    echo "datanimbus.io.ne :: Toggle mode is on, terminating build"
    echo "datanimbus.io.ne :: BUILD CANCLED"
    echo "****************************************************"
    exit 0
fi

cDate=`date +%Y.%m.%d.%H.%M` #Current date and time

if [ -f $WORKSPACE/../CICD ]; then
    CICD=`cat $WORKSPACE/../CICD`
fi
if [ -f $WORKSPACE/../DATA_STACK_RELEASE ]; then
    REL=`cat $WORKSPACE/../DATA_STACK_RELEASE`
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
    echo "datanimbus.io.ne :: Please Create file DATA_STACK_RELEASE with the releaese at $WORKSPACE or provide it as 1st argument of this script."
    echo "datanimbus.io.ne :: BUILD FAILED"
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
    echo "datanimbus.io.ne :: CICI env found"
    echo "****************************************************"
    TAG=$TAG"_"$cDate
    if [ ! -f $WORKSPACE/../DATA_STACK_NAMESPACE ]; then
        echo "****************************************************"
        echo "datanimbus.io.ne :: Please Create file DATA_STACK_NAMESPACE with the namespace at $WORKSPACE"
        echo "datanimbus.io.ne :: BUILD FAILED"
        echo "****************************************************"
        exit 0
    fi
    DATA_STACK_NS=`cat $WORKSPACE/../DATA_STACK_NAMESPACE`
fi

sh $WORKSPACE/scripts/prepare_yaml.sh $REL $2

echo "****************************************************"
echo "datanimbus.io.ne :: Using build :: "$TAG
echo "****************************************************"

cd $WORKSPACE

echo "****************************************************"
echo "datanimbus.io.ne :: Adding IMAGE_TAG in Dockerfile :: "$TAG
echo "****************************************************"
sed -i.bak s#__image_tag__#$TAG# Dockerfile

if [ -f $WORKSPACE/../CLEAN_BUILD_NE ]; then
    echo "****************************************************"
    echo "datanimbus.io.ne :: Doing a clean build"
    echo "****************************************************"
    
    docker build --no-cache -t datanimbus.io.ne:$TAG .
    rm $WORKSPACE/../CLEAN_BUILD_NE

    echo "****************************************************"
    echo "datanimbus.io.ne :: Copying deployment files"
    echo "****************************************************"

    if [ $CICD ]; then
        sed -i.bak s#__docker_registry_server__#$DOCKER_REG# ne.yaml
        sed -i.bak s#__release__#$TAG# ne.yaml
        sed -i.bak s#__namespace__#$DATA_STACK_NS# ne.yaml
        sed -i.bak '/imagePullSecrets/d' ne.yaml
        sed -i.bak '/- name: regsecret/d' ne.yaml

        kubectl delete deploy ne -n $DATA_STACK_NS || true # deleting old deployement
        kubectl delete service ne -n $DATA_STACK_NS || true # deleting old service
        #creating new deployment
        kubectl create -f ne.yaml
    fi

else
    echo "****************************************************"
    echo "datanimbus.io.ne :: Doing a normal build"
    echo "****************************************************"
    docker build -t datanimbus.io.ne:$TAG .
    if [ $CICD ]; then
        if [ $DOCKER_REG ]; then
            kubectl set image deployment/ne ne=$DOCKER_REG/datanimbus.io.ne:$TAG -n $DATA_STACK_NS --record=true
        else 
            kubectl set image deployment/ne ne=datanimbus.io.ne:$TAG -n $DATA_STACK_NS --record=true
        fi
    fi
fi
if [ $DOCKER_REG ]; then
    echo "****************************************************"
    echo "datanimbus.io.ne :: Docker Registry found, pushing image"
    echo "****************************************************"

    docker tag datanimbus.io.ne:$TAG $DOCKER_REG/datanimbus.io.ne:$TAG
    docker push $DOCKER_REG/datanimbus.io.ne:$TAG
fi
echo "****************************************************"
echo "datanimbus.io.ne :: BUILD SUCCESS :: datanimbus.io.ne:$TAG"
echo "****************************************************"
echo $TAG > $WORKSPACE/../LATEST_NE
