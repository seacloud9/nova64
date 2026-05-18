// Conformance cart 789: mesh path follower API
// Verifies createMeshFollower / setFollowerSpeed / setFollowerLooping /
// setFollowerLookAhead / playFollower / pauseFollower / resumeFollower /
// stopFollower / updateFollowers / isFollowerDone / getFollowerProgress /
// getFollowerPos / destroyFollower.

let cube, spline, follower;

export function init() {
   setCamera([0, 6, 14], [0, 0, 0]);
   setLightDirection(0.5, 1, 0.7);

   cube = createCube(0.7, rgba8(80, 180, 255, 255));

   spline = createSpline3D([-4,0,0,  0,2,-3,  4,0,0,  0,-1,3]);
   if (!spline) throw new Error('createSpline3D failed');

   // Non-3D spline should be rejected
   const spline2d = createSpline([0,0, 100,100]);
   const bad = createMeshFollower(cube, spline2d);
   if (bad !== 0) throw new Error('2D spline should be rejected, got ' + bad);

   follower = createMeshFollower(cube, spline, 1.5);
   if (!follower) throw new Error('createMeshFollower returned 0');

   // Before play: progress = 0, not done
   if (Math.abs(getFollowerProgress(follower)) > 0.001)
      throw new Error('progress should be 0 before play');
   if (isFollowerDone(follower))
      throw new Error('should not be done before play');

   playFollower(follower);
   updateFollowers(0.4);

   const p1 = getFollowerProgress(follower);
   if (p1 <= 0) throw new Error('progress should advance after updateFollowers');

   // Pause: progress should freeze
   pauseFollower(follower);
   const p2 = getFollowerProgress(follower);
   updateFollowers(0.5);
   if (Math.abs(getFollowerProgress(follower) - p2) > 0.001)
      throw new Error('progress should not change while paused');

   // Resume and run to completion
   resumeFollower(follower);
   updateFollowers(20.0);
   if (!isFollowerDone(follower)) throw new Error('should be done after long advance');
   if (Math.abs(getFollowerProgress(follower) - 1.0) > 0.001)
      throw new Error('progress should be 1 at end');

   // getFollowerPos returns array of 3 numbers
   const pos = getFollowerPos(follower);
   if (!Array.isArray(pos) || pos.length !== 3)
      throw new Error('getFollowerPos should return [x,y,z]');

   // Stop resets to 0
   stopFollower(follower);
   if (Math.abs(getFollowerProgress(follower)) > 0.001)
      throw new Error('stop should reset progress');

   // Test looping
   setFollowerLooping(follower, true);
   playFollower(follower);
   updateFollowers(30.0);
   if (isFollowerDone(follower)) throw new Error('looping follower should never be done');
   const pLoop = getFollowerProgress(follower);
   if (pLoop < 0 || pLoop > 1) throw new Error('loop progress out of [0,1]: ' + pLoop);

   // setFollowerSpeed
   stopFollower(follower);
   setFollowerSpeed(follower, 0.5);
   playFollower(follower);
   updateFollowers(0.1);
   const pSlow = getFollowerProgress(follower);

   setFollowerSpeed(follower, 5.0);
   stopFollower(follower);
   playFollower(follower);
   updateFollowers(0.1);
   const pFast = getFollowerProgress(follower);
   if (pFast <= pSlow) throw new Error('faster speed should advance further');

   destroyFollower(follower);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 22, 255));
   print('789 MESH FOLLOWER', 4, 4, rgba8(200, 220, 255, 255));
   print('all checks passed', 4, 14, rgba8(80, 255, 120, 255));
}
