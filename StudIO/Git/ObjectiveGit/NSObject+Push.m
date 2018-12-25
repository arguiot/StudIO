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
    GTRepository* repo = [GTRepository repositoryWithURL:url error:(NSError * _Nullable __autoreleasing * _Nullable)];
    
}
@end
