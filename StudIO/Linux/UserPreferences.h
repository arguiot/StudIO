//
//  UserPreferences.h
//  iSH
//
//  Created by Charlie Melbye on 11/12/18.
//

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSInteger, CapsLockMapping) {
    CapsLockMapNone = 0,
    CapsLockMapControl,
    CapsLockMapEscape,
};

NS_ASSUME_NONNULL_BEGIN

@interface Theme : NSObject

- (instancetype)initWithProperties:(NSDictionary<NSString *, id> *)props;
- (NSDictionary<NSString *, id> *)properties;

+ (instancetype)presetThemeNamed:(NSString *)name;
+ (NSArray<NSString *> *)presetNames;
- (NSString *)presetName;

@property (nonatomic, readonly) UIColor *foregroundColor;
@property (nonatomic, readonly) UIColor *backgroundColor;
@property (readonly) UIKeyboardAppearance keyboardAppearance;
@property (readonly) UIStatusBarStyle statusBarStyle;

@end
extern NSString *const kThemeForegroundColor;
extern NSString *const kThemeBackgroundColor;

@interface UserPreferences : NSObject

@property (nonatomic) CapsLockMapping capsLockMapping;
@property (nonatomic) Theme *theme;
@property (nonatomic) BOOL shouldDisableDimming;
@property (nonatomic, copy) NSNumber *fontSize;
@property (nonatomic) NSArray<NSString *> *launchCommand;

+ (instancetype)shared;

- (BOOL)hasChangedLaunchCommand;

@end

NS_ASSUME_NONNULL_END
