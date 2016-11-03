#!/bin/bash
echo "Generating forceios npm package"
rm shared
cp -r ../shared .
npm pack
rm -rf shared
ln -s ../shared
