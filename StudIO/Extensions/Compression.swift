//
//  Compression.swift
//  StudIO
//
//  Created by Arthur Guiot on 4/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation
import Compression

/** Available Compression Algorithms
 - Compression.lz4   : Fast compression
 - Compression.zlib  : Balanced between speed and compression
 - Compression.lzma  : High compression
 - Compression.lzfse : Apple-specific high performance compression. Faster and better compression than ZLIB, but slower than LZ4 and does not compress as well as LZMA.
 */
enum Compression {
    
    /// Fast compression
    case lz4
    
    /// Balanced between speed and compression
    case zlib
    
    /// High compression
    case lzma
    
    /// Apple-specific high performance compression. Faster and better compression than ZLIB, but slower than LZ4 and does not compress as well as LZMA.
    case lzfse
}

extension Data {
    
    
    /// Returns a Data object initialized by decompressing the data from the file specified by `path`. Attempts to determine the appropriate decompression algorithm using the path's extension.
    ///
    /// This method is equivalent to `Data(contentsOfArchive:usingCompression:)` with `nil compression`
    ///
    ///     let data = Data(contentsOfArchive: absolutePathToFile)
    ///
    /// - Parameter contentsOfArchive: The absolute path of the file from which to read data
    /// - Returns: A Data object initialized by decompressing the data from the file specified by `path`. Returns `nil` if decompression fails.
    init?(contentsOfArchive path: String) {
        self.init(contentsOfArchive: path, usedCompression: nil)
    }
    
    
    /// Returns a Data object initialized by decompressing the data from the file specified by `path` using the given `compression` algorithm.
    ///
    ///     let data = Data(contentsOfArchive: absolutePathToFile, usedCompression: Compression.lzfse)
    ///
    /// - Parameter contentsOfArchive: The absolute path of the file from which to read data
    /// - Parameter usedCompression: Algorithm to use during decompression. If compression is nil, attempts to determine the appropriate decompression algorithm using the path's extension
    /// - Returns: A Data object initialized by decompressing the data from the file specified by `path` using the given `compression` algorithm. Returns `nil` if decompression fails.
    init?(contentsOfArchive path: String, usedCompression: Compression?) {
        let pathURL = URL(fileURLWithPath: path)
        
        // read in the compressed data from disk
        guard let compressedData = try? Data(contentsOf: pathURL) else {
            return nil
        }
        
        // if compression is set use it
        let compression: Compression
        if usedCompression != nil {
            compression = usedCompression!
        }
        else {
            // otherwise, attempt to use the file extension to determine the compression algorithm
            switch pathURL.pathExtension.lowercased() {
            case "lz4"  :    compression = Compression.lz4
            case "zlib" :    compression = Compression.zlib
            case "lzma" :    compression = Compression.lzma
            case "lzfse":    compression = Compression.lzfse
            default:        return nil
            }
        }
        
        // finally, attempt to uncompress the data and initalize self
        if let uncompressedData = compressedData.uncompressed(using: compression) {
            self = uncompressedData
        }
        else {
            return nil
        }
    }
    
    
    /// Returns a Data object created by compressing the receiver using the given compression algorithm.
    ///
    ///     let compressedData = someData.compressed(using: Compression.lzfse)
    ///
    /// - Parameter using: Algorithm to use during compression
    /// - Returns: A Data object created by encoding the receiver's contents using the provided compression algorithm. Returns nil if compression fails or if the receiver's length is 0.
    func compressed(using compression: Compression) -> Data? {
        return self.data(using: compression, operation: .encode)
    }
    
    /// Returns a Data object by uncompressing the receiver using the given compression algorithm.
    ///
    ///     let uncompressedData = someCompressedData.uncompressed(using: Compression.lzfse)
    ///
    /// - Parameter using: Algorithm to use during decompression
    /// - Returns: A Data object created by decoding the receiver's contents using the provided compression algorithm. Returns nil if decompression fails or if the receiver's length is 0.
    func uncompressed(using compression: Compression) -> Data? {
        return self.data(using: compression, operation: .decode)
    }
    
    
    private enum CompressionOperation {
        case encode
        case decode
    }
    
    private func data(using compression: Compression, operation: CompressionOperation) -> Data? {
        
        guard self.count > 0 else {
            return nil
        }
        
        let streamPtr = UnsafeMutablePointer<compression_stream>.allocate(capacity: 1)
        var stream = streamPtr.pointee
        var status : compression_status
        var op : compression_stream_operation
        var flags : Int32
        var algorithm : compression_algorithm
        
        switch compression {
        case .lz4:
            algorithm = COMPRESSION_LZ4
        case .lzfse:
            algorithm = COMPRESSION_LZFSE
        case .lzma:
            algorithm = COMPRESSION_LZMA
        case .zlib:
            algorithm = COMPRESSION_ZLIB
        }
        
        switch operation {
        case .encode:
            op = COMPRESSION_STREAM_ENCODE
            flags = Int32(COMPRESSION_STREAM_FINALIZE.rawValue)
        case .decode:
            op = COMPRESSION_STREAM_DECODE
            flags = 0
        }
        
        status = compression_stream_init(&stream, op, algorithm)
        guard status != COMPRESSION_STATUS_ERROR else {
            // an error occurred
            return nil
        }
        
        let outputData = withUnsafeBytes { (bytes: UnsafePointer<UInt8>) -> Data? in
            // setup the stream's source
            stream.src_ptr = bytes
            stream.src_size = count
            
            // setup the stream's output buffer
            // we use a temporary buffer to store the data as it's compressed
            let dstBufferSize : size_t = 4096
            let dstBufferPtr = UnsafeMutablePointer<UInt8>.allocate(capacity: dstBufferSize)
            stream.dst_ptr = dstBufferPtr
            stream.dst_size = dstBufferSize
            // and we store the output in a mutable data object
            var outputData = Data()
            
            
            repeat {
                status = compression_stream_process(&stream, flags)
                
                switch status {
                case COMPRESSION_STATUS_OK:
                    // Going to call _process at least once more, so prepare for that
                    if stream.dst_size == 0 {
                        // Output buffer full...
                        
                        // Write out to outputData
                        outputData.append(dstBufferPtr, count: dstBufferSize)
                        
                        // Re-use dstBuffer
                        stream.dst_ptr = dstBufferPtr
                        stream.dst_size = dstBufferSize
                    }
                    
                case COMPRESSION_STATUS_END:
                    // We are done, just write out the output buffer if there's anything in it
                    if stream.dst_ptr > dstBufferPtr {
                        outputData.append(dstBufferPtr, count: stream.dst_ptr - dstBufferPtr)
                    }
                    
                case COMPRESSION_STATUS_ERROR:
                    return nil
                    
                default:
                    break
                }
                
            } while status == COMPRESSION_STATUS_OK
            
            return outputData
        }
        
        compression_stream_destroy(&stream)
        
        return outputData
    }
    
}
