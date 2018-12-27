//
//  NSObject+Push.m
//  StudIO
//
//  Created by Arthur Guiot on 25/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

#import "NSObject+Push.h"
#import <ObjectiveGit/ObjectiveGit.h>

@implementation Push: NSObject
- (BOOL)push:(NSURL*)url progress:(void(^)(unsigned int current, unsigned int total, size_t bytes, BOOL * _Nonnull stop))progress {
    NSDictionary *userInfo = @{
                               NSLocalizedDescriptionKey: NSLocalizedString(@"Couldn't find repository", nil),
                               NSLocalizedFailureReasonErrorKey: NSLocalizedString(@"The operation timed out.", nil),
                               NSLocalizedRecoverySuggestionErrorKey: NSLocalizedString(@"Try to force close the app and do it again.", nil)
                               };
    NSError  __autoreleasing * _Nullable error = [NSError errorWithDomain:GTFilterErrorDomain
                                         code:-57
                                     userInfo:userInfo];
    
    GTRepository* repo = [GTRepository repositoryWithURL:url error:&error];
    NSArray<GTBranch *> *branches = [repo branches:&error];
    NSArray<NSString *> *remotes = [repo remoteNamesWithError:&error];
    GTRemote* remote = [GTRemote remoteWithName:remotes[0] inRepository:repo error:&error];
    [repo pushBranches:branches toRemote:remote withOptions:NULL error:NULL progress: progress];
    return true;
}
@end
