import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/firebase-constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, collections = ['sensor_data', 'sensor_realtime'] } = body;

    let deletedCount = 0;

    // Delete from sensor_data (historical)
    if (collections.includes('sensor_data')) {
      const sensorDataRef = collection(db, COLLECTIONS.SENSOR_DATA);
      let q = sensorDataRef;

      // If deviceId specified, only delete that device's data
      // Note: We can't use where() with delete, so we'll fetch and delete in batches
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500; // Firestore batch limit

      for (const docSnap of snapshot.docs) {
        // If deviceId filter is specified, check it
        if (!deviceId || docSnap.data().deviceId === deviceId) {
          batch.delete(docSnap.ref);
          batchCount++;
          deletedCount++;

          // Commit batch if we hit the limit
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }

      // Commit remaining
      if (batchCount > 0) {
        await batch.commit();
      }
    }

    // Delete from sensor_realtime (latest readings)
    if (collections.includes('sensor_realtime')) {
      const realtimeRef = collection(db, COLLECTIONS.SENSOR_REALTIME);

      if (deviceId) {
        // Delete specific device
        await deleteDoc(doc(db, COLLECTIONS.SENSOR_REALTIME, deviceId));
        deletedCount++;
      } else {
        // Delete all realtime data
        const snapshot = await getDocs(realtimeRef);
        const batch = writeBatch(db);

        snapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        await batch.commit();
        deletedCount += snapshot.size;
      }
    }

    return NextResponse.json({
      success: true,
      message: deviceId
        ? `Cleared data for device: ${deviceId}`
        : 'Cleared all sensor data',
      deletedCount,
      collections,
      deviceId: deviceId || 'all',
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint for REST API compliance
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const deviceId = searchParams.get('deviceId') || undefined;

  try {
    let deletedCount = 0;

    // Delete from sensor_data
    const sensorDataRef = collection(db, COLLECTIONS.SENSOR_DATA);
    const snapshot = await getDocs(sensorDataRef);

    const batch = writeBatch(db);
    let batchCount = 0;

    for (const docSnap of snapshot.docs) {
      if (!deviceId || docSnap.data().deviceId === deviceId) {
        batch.delete(docSnap.ref);
        batchCount++;
        deletedCount++;

        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    // Delete from sensor_realtime
    const realtimeRef = collection(db, COLLECTIONS.SENSOR_REALTIME);

    if (deviceId) {
      await deleteDoc(doc(db, COLLECTIONS.SENSOR_REALTIME, deviceId));
      deletedCount++;
    } else {
      const realtimeSnapshot = await getDocs(realtimeRef);
      const realtimeBatch = writeBatch(db);

      realtimeSnapshot.docs.forEach((docSnap) => {
        realtimeBatch.delete(docSnap.ref);
      });

      await realtimeBatch.commit();
      deletedCount += realtimeSnapshot.size;
    }

    return NextResponse.json({
      success: true,
      message: deviceId
        ? `Cleared data for device: ${deviceId}`
        : 'Cleared all sensor data',
      deletedCount,
      deviceId: deviceId || 'all',
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
