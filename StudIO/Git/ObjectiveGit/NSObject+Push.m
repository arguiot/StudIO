//
//  NSObject+Push.m
//  StudIO
//
//  Created by Arthur Guiot on 25/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

#import "NSObject+Push.h"
#import <ObjectiveGit/ObjectiveGit.h>

@implementation NSObject (Push)
- (BOOL)push:(NSURL*)url {
    NSDictionary *userInfo = @{
                               NSLocalizedDescriptionKey: NSLocalizedString(@"Couldn't find repository", nil),
                               NSLocalizedFailureReasonErrorKey: NSLocalizedString(@"The operation timed out.", nil),
                               NSLocalizedRecoverySuggestionErrorKey: NSLocalizedString(@"Try to force close the app and do it again.", nil)
                               };
    NSError  __autoreleasing * _Nullable error = [NSError errorWithDomain:GTFilterErrorDomain
                                         code:-57
                                     userInfo:userInfo];
    
    GTRepository* repo = [GTRepository repositoryWithURL:url error:&error];
    git_push_options *opts = (__bridge git_push_options *)(@{});
    git_strarray arr;
    git_remote_list(&arr, (__bridge git_repository *)(repo));
    GTRemote* remote = [GTRemote remoteWithName:@"master" inRepository:repo error:&error];
    git_remote_push(remote.git_remote, NULL, opts);
    return true;
}
@end
