//
//  NSObject+NodeRunner.h
//  StudIO
//
//  Created by Arthur Guiot on 29/1/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef NodeRunner_h
#define NodeRunner_h

@interface NodeRunner : NSObject {}
+ (void) startEngineWithArguments:(NSArray*)arguments;
@end

#endif
