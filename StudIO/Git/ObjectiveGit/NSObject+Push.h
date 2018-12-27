//
//  NSObject+Push.h
//  StudIO
//
//  Created by Arthur Guiot on 25/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <ObjectiveGit/ObjectiveGit.h>
NS_ASSUME_NONNULL_BEGIN

@interface Push: NSObject
- (BOOL)push:(NSURL*)url progress:(void(^)(unsigned int current, unsigned int total, size_t bytes, BOOL * _Nonnull stop))progress;
- (BOOL)pull:(NSURL*)url progress:(void (^)(const git_transfer_progress * _Nonnull, BOOL * _Nonnull))progress;
@end

NS_ASSUME_NONNULL_END
