docker run -d --name fuse-pools --env-file .env -e ENTRY_POINT=FusePoolsStrategy/FusePoolsStrategy.js strategy
docker run -d --name story-weth-pools --env-file .env -e ENTRY_POINT=StoryWethPoolsStrategy/WethPoolsStrategy.js strategy

docker run -d --name weth-pools --env-file .env.Shaka -e ENTRY_POINT=WethPoolsStrategy/WethPoolsStrategy.js strategy
docker run -d --name wbtc-pools --env-file .env.Shaka -e ENTRY_POINT=WbtcFuseStrategy/WbtcFuseStrategy.js strategy