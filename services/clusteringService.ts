import { Track, Cluster } from '../types';
import { CLUSTER_COLORS } from '../constants';

interface Point {
  features: number[];
  trackId: string;
}

// Simple Euclidean distance
const distance = (p1: number[], p2: number[]): number => {
  return Math.sqrt(p1.reduce((sum, val, i) => sum + Math.pow(val - p2[i], 2), 0));
};

export const performClustering = (tracks: Track[], k: number = 3): { clusteredTracks: Track[], clusters: Cluster[] } => {
  // Filter tracks that have features
  const validTracks = tracks.filter(t => t.features);
  
  if (validTracks.length === 0) {
    return { clusteredTracks: tracks, clusters: [] };
  }

  // Adjust k if we have fewer tracks than clusters
  const actualK = Math.min(k, validTracks.length);

  // Normalize/Extract vector: [energy, valence, danceability, acousticness]
  // We weight them equally for now.
  const points: Point[] = validTracks.map(t => ({
    trackId: t.id,
    features: [
      t.features!.energy,
      t.features!.valence,
      t.features!.danceability,
      t.features!.acousticness
    ]
  }));

  // Initialize centroids randomly
  let centroids: number[][] = [];
  const pickedIndices = new Set<number>();
  while (centroids.length < actualK) {
    const idx = Math.floor(Math.random() * points.length);
    if (!pickedIndices.has(idx)) {
      pickedIndices.add(idx);
      centroids.push([...points[idx].features]);
    }
  }

  let assignments: number[] = new Array(points.length).fill(-1);
  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations) {
    let changed = false;

    // Assignment step
    points.forEach((point, idx) => {
      let minDist = Infinity;
      let clusterIdx = -1;

      centroids.forEach((centroid, cIdx) => {
        const d = distance(point.features, centroid);
        if (d < minDist) {
          minDist = d;
          clusterIdx = cIdx;
        }
      });

      if (assignments[idx] !== clusterIdx) {
        assignments[idx] = clusterIdx;
        changed = true;
      }
    });

    // Update Step
    if (!changed) break;

    const newCentroids = Array(actualK).fill(0).map(() => Array(4).fill(0));
    const counts = Array(actualK).fill(0);

    points.forEach((point, idx) => {
      const cIdx = assignments[idx];
      if (cIdx !== -1) {
        point.features.forEach((val, fIdx) => {
          newCentroids[cIdx][fIdx] += val;
        });
        counts[cIdx]++;
      }
    });

    centroids = newCentroids.map((sumVec, cIdx) => {
      if (counts[cIdx] === 0) return centroids[cIdx]; // Keep old if empty
      return sumVec.map(val => val / counts[cIdx]);
    });

    iterations++;
  }

  // Map results back
  const clusters: Cluster[] = centroids.map((c, i) => ({
    id: i,
    name: `Cluster ${i + 1}`,
    color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
    // For 2D viz centroid, we just take Energy (0) and Valence (1)
    centroid: { x: c[1], y: c[0] } 
  }));

  const clusteredTracks = tracks.map(t => {
    const pIdx = points.findIndex(p => p.trackId === t.id);
    if (pIdx !== -1) {
      return { ...t, clusterId: assignments[pIdx] };
    }
    return t;
  });

  return { clusteredTracks, clusters };
};
