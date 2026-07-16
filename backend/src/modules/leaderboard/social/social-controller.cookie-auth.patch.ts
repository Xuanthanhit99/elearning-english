// /*
//  * Friends leaderboard
//  */

// @Get('friends')
// @UseGuards(JwtAuthGuard)
// getFriendsLeaderboard(
//   @Req() req: { user: { id: string } },
// ) {
//   return this.socialLeaderboardService
//     .getFriendsLeaderboard(req.user.id);
// }

// /*
//  * Club list
//  */

// @Get('clubs')
// @UseGuards(JwtAuthGuard)
// getMyClubs(
//   @Req() req: { user: { id: string } },
// ) {
//   return this.socialLeaderboardService
//     .getMyClubs(req.user.id);
// }

// /*
//  * Club leaderboard
//  */

// @Get('clubs/:clubId')
// @UseGuards(JwtAuthGuard)
// getClubLeaderboard(
//   @Req() req: { user: { id: string } },
//   @Param('clubId') clubId: string,
// ) {
//   return this.socialLeaderboardService
//     .getClubLeaderboard(
//       req.user.id,
//       clubId,
//     );
// }
