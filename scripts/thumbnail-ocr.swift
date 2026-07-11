import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count == 2 else {
  FileHandle.standardError.write(Data("thumbnail path required\n".utf8))
  exit(2)
}

let imageURL = URL(fileURLWithPath: CommandLine.arguments[1])
guard let image = NSImage(contentsOf: imageURL) else {
  FileHandle.standardError.write(Data("thumbnail image unavailable\n".utf8))
  exit(3)
}

var proposedRect = NSRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
  FileHandle.standardError.write(Data("thumbnail image invalid\n".utf8))
  exit(4)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

do {
  try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
  let text = (request.results ?? [])
    .compactMap { $0.topCandidates(1).first?.string }
    .joined(separator: "\n")
  let output = try JSONSerialization.data(withJSONObject: ["text": text], options: [])
  FileHandle.standardOutput.write(output)
} catch {
  FileHandle.standardError.write(Data("thumbnail OCR failed\n".utf8))
  exit(5)
}
