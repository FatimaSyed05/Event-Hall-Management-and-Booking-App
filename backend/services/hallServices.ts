import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export interface HallData {
  managerId: string;
  managerName: string;
  managerEmail: string;
  hallName: string;
  address: string;
  contactPhone: string;
  capacity: number;
  price: number;
  tables: number;
  chairs: number;
  hallType: 'Indoor' | 'Outdoor';
  otherInfo?: string;
  facilities: string[];
  mediaFiles: { uri: string; type: 'image' | 'video' }[];
  verificationDoc?: { uri: string; name: string; type: string } | null;
  location: { latitude: number; longitude: number; address: string };
  status: 'pending_approval' | 'approved' | 'rejected' | 'deleted';
  createdAt: any; 
}

export const createHall = async (hallData: Omit<HallData, 'status' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'halls'), {
      ...hallData,
      status: 'pending_approval',
      createdAt: serverTimestamp(),
    });
    return docRef.id; 
  } catch (error) {
    console.error("Error creating hall:", error);
    throw new Error("Failed to create hall");
  }
};

export const getHallsByManager = async (managerId: string) => {
  try {
    const q = query(
      collection(db, 'halls'), 
      where('managerId', '==', managerId),
      where('status', '!=', 'deleted') 
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching manager halls:", error);
    throw new Error("Failed to fetch halls");
  }
};

export const getPendingHallsForAdmin = async () => {
  try {
    const q = query(
      collection(db, 'halls'), 
      where('status', '==', 'pending_approval')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching pending halls:", error);
    throw new Error("Failed to fetch pending halls");
  }
};

export const getAvailableHallsForCustomers = async () => {
  try {
    const q = query(
      collection(db, 'halls'), 
      where('status', '==', 'approved')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching available halls:", error);
    throw new Error("Failed to fetch available halls");
  }
};

export const getHallById = async (hallId: string) => {
  try {
    const docRef = doc(db, 'halls', hallId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null; // Agar hall na mile
  } catch (error) {
    console.error("Error fetching hall by ID:", error);
    throw new Error("Failed to fetch hall details");
  }
};

export const updateHallStatus = async (hallId: string, newStatus: 'approved' | 'rejected' | 'deleted') => {
  try {
    const hallRef = doc(db, 'halls', hallId);
    await updateDoc(hallRef, { 
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error updating hall status:", error);
    throw new Error("Failed to update hall status");
  }
};

export const deleteHall = async (hallId: string) => {
  return await updateHallStatus(hallId, 'deleted');
};
export const getHallsForAdmin = async (statusFilter?: string) => {
  try {
    const constraints: any[] = [];
    
    if (statusFilter && statusFilter !== 'All') {
      const dbStatus = statusFilter === 'Pending' ? 'pending_approval' :
                       statusFilter === 'Approved' ? 'approved' :
                       statusFilter === 'Disapproved' ? 'rejected' : 'deleted';
      constraints.push(where('status', '==', dbStatus));
    }
    
    const q = query(collection(db, 'halls'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching halls for admin:", error);
    throw new Error("Failed to fetch halls");
  }
};