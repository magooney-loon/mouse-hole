import type { PostProcessingPreset } from './types';

/**
 * Bundled post-processing presets — committed to git, available in all environments.
 * To add a preset: create it in Studio, click "Copy as Code", paste here, commit.
 */
export const BUNDLED_PP_PRESETS: PostProcessingPreset[] = [
	{
		id: '5cd47043-9178-4a45-9f56-296943c0cabc',
		name: 'global',
		createdAt: 1776024032623,
		settings: {
			bloom: {
				enabled: true,
				intensity: 0.36,
				luminanceThreshold: 0.149,
				luminanceSmoothing: 0.16,
				kernelSize: 2,
				blendFunction: 2,
				mipmapBlur: true,
				radius: 0.69,
				levels: 8,
				resolutionScale: 0.5
			},
			smaa: {
				enabled: true,
				preset: 1,
				edgeDetectionMode: 1,
				predicationMode: 1
			},
			fxaa: {
				enabled: true,
				minEdgeThreshold: 0.05,
				maxEdgeThreshold: 0.12,
				subpixelQuality: 0.75
			},
			vignette: {
				enabled: true,
				offset: 0.5,
				darkness: 0.63,
				technique: 0
			},
			pixelation: {
				enabled: false,
				granularity: 2
			},
			glitch: {
				enabled: false,
				delay: 2.5,
				duration: 0.8,
				strength: 0.65,
				ratio: 0.85,
				columns: 0.05,
				mode: 1,
				blendFunction: 23,
				dtSize: 64
			},
			noise: {
				enabled: false,
				premultiply: true,
				blendFunction: 28
			},
			chromaticAberration: {
				enabled: false,
				radialModulation: false,
				modulationOffset: 0.15,
				offsetX: 0.01,
				offsetY: 0.01,
				blendFunction: 23
			},
			brightnessContrast: {
				enabled: false,
				brightness: 0,
				contrast: 0,
				blendFunction: 23
			},
			hueSaturation: {
				enabled: false,
				hue: 0,
				saturation: 0,
				blendFunction: 23
			},
			sepia: {
				enabled: false,
				intensity: 1,
				blendFunction: 23
			},
			dotScreen: {
				enabled: false,
				angle: 1.57,
				scale: 1,
				blendFunction: 23
			},
			scanline: {
				enabled: false,
				density: 1.25,
				opacity: 0.5,
				scrollSpeed: 0,
				blendFunction: 25
			},
			shockWave: {
				enabled: false,
				speed: 1.25,
				maxRadius: 0.5,
				waveSize: 0.2,
				amplitude: 0.05,
				epicenterX: 0,
				epicenterY: 0,
				epicenterZ: 0,
				triggered: false
			},
			ascii: {
				enabled: false,
				cellSize: 16,
				inverted: false
			},
			toneMapping: {
				enabled: true,
				mode: 7,
				whitePoint: 4,
				middleGrey: 0.6,
				blendFunction: 23,
				resolution: 256,
				minLuminance: 0.01,
				averageLuminance: 1,
				adaptationRate: 1
			},
			grid: {
				enabled: false,
				scale: 1,
				lineWidth: 0,
				blendFunction: 25
			},
			tiltShift: {
				enabled: false,
				offset: 0,
				rotation: 0,
				focusArea: 1,
				feather: 0,
				kernelSize: 3,
				blendFunction: 23
			},
			lensDistortion: {
				enabled: false,
				distortionX: 0,
				distortionY: 0,
				principalX: 0,
				principalY: 0,
				focalLengthX: 1,
				focalLengthY: 1,
				skew: 0.65
			},
			colorDepth: {
				enabled: true,
				bits: 32,
				blendFunction: 10
			},
			depthOfField: {
				enabled: false,
				focusDistance: 76.3,
				focusRange: 23.500000000000004,
				bokehScale: 0.1,
				blendFunction: 23,
				resolutionScale: 0.8
			},
			godRays: {
				enabled: false,
				samples: 60,
				density: 0.96,
				decay: 0.9,
				weight: 0.4,
				exposure: 0.6,
				clampMax: 1,
				blur: true,
				kernelSize: 1,
				blendFunction: 28,
				sunX: 0,
				sunY: 5,
				sunZ: 0,
				sunColor: 16768426,
				resolutionScale: 0.5
			},
			ssao: {
				enabled: false,
				samples: 9,
				rings: 7,
				radius: 0.1825,
				intensity: 3.5000000000000004,
				bias: 0.033,
				fade: 0.36,
				luminanceInfluence: 0.42,
				blendFunction: 2,
				worldDistanceThreshold: 0.97,
				worldDistanceFalloff: 0.03,
				worldProximityThreshold: 0.0005,
				worldProximityFalloff: 0.001,
				minRadiusScale: 0.1,
				color: 1054275,
				depthAwareUpsampling: true,
				resolutionScale: 0.5
			},
			outline: {
				enabled: false,
				edgeStrength: 1,
				visibleEdgeColor: 16777215,
				hiddenEdgeColor: 2230538,
				pulseSpeed: 0,
				xRay: true,
				blur: false,
				kernelSize: 1,
				blendFunction: 22,
				patternScale: 1,
				multisampling: 0,
				resolutionScale: 0.5
			},
			depthEffect: {
				enabled: false,
				inverted: true,
				blendFunction: 20
			}
		}
	}
];
