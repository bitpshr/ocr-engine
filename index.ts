import { promises as fs } from 'fs';

import * as aws from 'aws-sdk';
import { AnalyzeDocumentResponse, Document } from 'aws-sdk/clients/textract';
import { createCanvas, loadImage } from 'canvas';

aws.config.update({ region: 'us-east-1' });

const textract = new aws.Textract();

function analyze(config: Document): Promise<AnalyzeDocumentResponse> {
	return new Promise(async (resolve, reject) => {
		textract.analyzeDocument(
			{
				Document: config,
				FeatureTypes: ['FORMS'],
			},
			(error, data) => {
				if (error) {
					return reject(error);
				}
				resolve(data);
			}
		);
	});
}

/**
 * Analyzes a document at a local file path for text
 *
 * @param inputPath - Path to input file
 * @returns - Promise resolving to an AWS Textract result payload
 */
export async function analyzeLocalFile(
	inputPath: string
): Promise<AnalyzeDocumentResponse> {
	return analyze({
		Bytes: await fs.readFile(inputPath),
	});
}

/**
 * Analyzes a document hosted on AWS S3 for text
 *
 * @param bucket - AWS S3 bucket label
 * @param filename - AWS S3 filename within a bucket
 * @returns - Promise resolving to an AWS Textract result payload
 */
export function analyzeRemoteFile(
	bucket: string,
	filename: string
): Promise<AnalyzeDocumentResponse> {
	return analyze({
		S3Object: {
			Bucket: bucket,
			Name: filename,
		},
	});
}

/**
 * Draw result geometry on a local or remote image and save the result as a PNG
 *
 * @param inputPath - Local or remote image URI
 * @param analysis - Promise resolving to an AWS Textract result payload
 */
export async function generateDebugImage(
	inputPath: string,
	analysis: Promise<AnalyzeDocumentResponse>
): Promise<Buffer> {
	const analysisResult = await analysis;
	const image = await loadImage(inputPath);
	const canvas = createCanvas(image.width, image.height);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(image, 0, 0, image.width, image.height);
	ctx.lineWidth = 4;

	analysisResult.Blocks?.forEach(({ Geometry, Confidence = 0 }) => {
		if (!Geometry || !Geometry.BoundingBox) return;
		const hue = ((Confidence / 100) * 120).toString(10);
		ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
		ctx.strokeRect(
			Geometry.BoundingBox.Left || 0 * image.width,
			Geometry.BoundingBox.Top || 0 * image.height,
			Geometry.BoundingBox.Width || 0 * image.width,
			Geometry.BoundingBox.Height || 0 * image.height
		);
		ctx.stroke();
	});

	return canvas.toBuffer();
}
