#!/bin/bash

set -e

ENV=$1
TAG=$2
ACR=$3
RELEASENAME=$4
REPONAME=$5
REPOPATH=$6
DEVOPSUTILSPATH=$7
DEVOPSUTILSTAG=$8
NAMESPACE=$9
WORKSPACE=${10}

function sedeasy {
  sed -i "s/$(echo $1 | sed -e 's/\([[\/.*]\|\]\)/\\&/g')/$(echo $2 | sed -e 's/[\/&]/\\&/g')/g" $3
}

# clone chart
cd $WORKSPACE
cp -r $REPOPATH/helm-chart chart-$ENV
cd chart-$ENV

export imagerepository=$ACR/ms/$REPONAME
export imagetag=$TAG

# Note: source is yml, destination is yaml (azure uses yml, helm uses yaml, etc.)
cp $REPOPATH/values-$ENV.yml values.yaml
yq e '.image.repository=env(imagerepository)' -i values.yaml
yq e '.image.tag=env(imagetag)' -i values.yaml

# package chart including values file
cd $WORKSPACE
mkdir -p $TAG-$ENV
echo $DEVOPSUTILSTAG $TAG $TAG-$ENV
helm package chart-$ENV --version $DEVOPSUTILSTAG --app-version $TAG -d $TAG-$ENV
cd $TAG-$ENV
mv $RELEASENAME-$DEVOPSUTILSTAG.tgz chart.tgz

# clone install.ps1
cp $REPOPATH/scripts/install.ps1 .
sedeasy "{{tag}}" "$TAG" install.ps1
sedeasy "{{reponame}}" "$REPONAME" install.ps1
sedeasy "{{namespace}}" "$NAMESPACE" install.ps1
sedeasy "{{chartPath}}" "chart.tgz" install.ps1

# clone rollback.ps1
cp $REPOPATH/scripts/rollback.ps1 .
sedeasy "{{reponame}}" "$REPONAME" rollback.ps1
sedeasy "{{namespace}}" "$NAMESPACE" rollback.ps1

# validate chart
echo "All environments are validated on all builds, because artifacts can be promoted"
echo "Validating chart on $ENV. Errors on this step are *source* errors, not pipeline errors"
helm template $REPONAME chart.tgz --debug

cd $WORKSPACE
ls -l
zip -r $TAG-$ENV.zip $TAG-$ENV
