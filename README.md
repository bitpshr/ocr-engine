# OCR Engine

OCR Engine exposes a simple API for performing optical character recognition on any file.

**Note: This is an initial MVP and is not meant for production use.**

## Example

```ts
// Analyze a local file for words and relationships
const localAnalysis = analyzeLocalFile('torrey-arrest-intake.png');

// Analyze a file hosted on S3 for words and relationships
const remoteAnalysis = analyzeRemoteFile('torrey', 'arrest-intake.png');

// Generate a debug image showing matches with confidence
fs.writeFileSync('debug.png', generateDebugImage('debug.png', localAnalysis));
```

## API

The following API is exposed by OCR Engine.

1. `analyzeLocalFile(inputPath: string): Promise<AnalyzeDocumentResponse>`

    Analyze a file stored locally on disk. `inputPath` should point to a file relative to the current working directory.

2. `analyzeRemoteFile(bucket: string, filename: string): Promise<AnalyzeDocumentResponse>`

    Analyze a file stored remotely on Amazon S3. `bucket` should be the name of an S3 bucket and `filename` should point to a file within the chosen bucket.

3. `generateDebugImage(inputPath: string, analysis: Promise<AnalyzeDocumentResponse>): Promise<Buffer>`

    Return an image buffer that shows the original file with highlighted word matches. `inputPath` should point to a file relative to the current working directory, and `analysis` should be the response from `analyzeLocalFile` or `analyzeRemoteFile`. Word matches will be colored on the image using a gradient that indicates match confidence level.

## Architecture

-   Built on top of Amazon Textract
    OCR Engine is built on top of Amazon's most prominent OCR SaaS offering, [Amazon Textract](https://aws.amazon.com/textract/). This service uses Amazon's own machine learning infrastructure under the hood and has extreme accuracy even with poor document conditions. This accuracy and robustness of this service set it apart substantially from the rest of the competitor landscape. As added bonus, Textract offers geometry-based matches that will provide additional vectors if Life Admin decides to use machine learning to classify documents.
-   API kept as minimal as possible
    There isn't much that needs to happen within OCR engine as far as surrounding API. Amazon Textract is available through the standard `aws-sdk` NPM package and its API is nice enough. OCR engine is left as thin as possible, only exposing Textract in an API that's most applicable for Life Admin.
-   No manipulation of results
    Amazon Textract results are flat lists of result objects that contain metadata that can be used to establish hierarchical relations between detected words. For example, it's possible to construct a tree-like object of a `Page` that contains many `Line` children, each of which contain `Word` children. This is entirely opt-in; this metadata can simply be ignored (or only used for machine learning vectors), and the result set can also be used as-is since it's flat and each result contains a word `value`. OCR Engine intentionally leaves its result set untouched to facilitate efficient operation under high load, essentially serving as a Textract pass-through.
