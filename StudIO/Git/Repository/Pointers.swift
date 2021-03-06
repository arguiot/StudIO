//
//  Pointers.swift
//  StudIO
//
//  Created by Arthur Guiot on 2020-09-16.
//  Copyright © 2020 Arthur Guiot. All rights reserved.
//

import Foundation

/// A pointer to a git object.
public protocol PointerType: Hashable {
    /// The OID of the referenced object.
    var oid: OID { get }

    /// The libgit2 `git_otype` of the referenced object.
    var type: git_otype { get }
}

public extension PointerType {
    static func == (lhs: Self, rhs: Self) -> Bool {
        return lhs.oid == rhs.oid
            && lhs.type == rhs.type
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(oid)
    }
}

/// A pointer to a git object.
public enum Pointer: PointerType {
    case commit(OID)
    case tree(OID)
    case blob(OID)
    case tag(OID)

    public var oid: OID {
        switch self {
        case let .commit(oid):
            return oid
        case let .tree(oid):
            return oid
        case let .blob(oid):
            return oid
        case let .tag(oid):
            return oid
        }
    }

    public var type: git_otype {
        switch self {
        case .commit:
            return GIT_OBJ_COMMIT
        case .tree:
            return GIT_OBJ_TREE
        case .blob:
            return GIT_OBJ_BLOB
        case .tag:
            return GIT_OBJ_TAG
        }
    }

    /// Create an instance with an OID and a libgit2 `git_otype`.
    init?(oid: OID, type: git_otype) {
        switch type {
        case GIT_OBJ_COMMIT:
            self = .commit(oid)
        case GIT_OBJ_TREE:
            self = .tree(oid)
        case GIT_OBJ_BLOB:
            self = .blob(oid)
        case GIT_OBJ_TAG:
            self = .tag(oid)
        default:
            return nil
        }
    }
}

extension Pointer: CustomStringConvertible {
    public var description: String {
        switch self {
        case .commit:
            return "commit(\(oid))"
        case .tree:
            return "tree(\(oid))"
        case .blob:
            return "blob(\(oid))"
        case .tag:
            return "tag(\(oid))"
        }
    }
}

public struct PointerTo<T: ObjectType>: PointerType {
    public let oid: OID

    public var type: git_otype {
        return T.type
    }

    public init(_ oid: OID) {
        self.oid = oid
    }
}
