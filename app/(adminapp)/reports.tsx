import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { webContainerStyle } from '@/constants/webstyles';
import AdminBottomNav from '../../components/admin-bottom-nav';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

interface Manager {
  id: string;
  name: string;
}

interface Hall {
  id: string;
  name: string;
  managerId?: string;
}

export default function ReportsScreen() {
  const [category, setCategory] = useState<'All Categories' | 'Events' | 'Bookings' | 'Requests'>('All Categories');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showHallModal, setShowHallModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [managersList, setManagersList] = useState<Manager[]>([]);
  const [allHalls, setAllHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  
  const pdfBlobRef = useRef<Blob | null>(null);
  const [pdfFileUri, setPdfFileUri] = useState<string>('');
  const webStartInputRef = useRef<HTMLInputElement>(null);
  const webEndInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRef = collection(db, 'users');
        const managersQuery = query(usersRef, where('role', '==', 'manager'));
        const managersSnap = await getDocs(managersQuery);
        
        const managers: Manager[] = [];
        managersSnap.docs.forEach((doc) => {
          const data = doc.data();
          managers.push({
            id: doc.id,
            name: data.name || 'Unknown Manager'
          });
        });

        const hallsRef = collection(db, 'halls');
        const hallsSnap = await getDocs(hallsRef);
        
        const halls: Hall[] = [];
        
        hallsSnap.docs.forEach((doc) => {
          const data = doc.data();
          
          const isApproved = data.approvalStatus === 'approved' || 
                            data.status === 'approved' || 
                            data.isApproved === true ||
                            !data.approvalStatus;
          
          if (isApproved) {
            halls.push({
              id: doc.id,
              name: data.name || data.hallName || 'Unknown Hall',
              managerId: data.managerId || data.managerID || data.userId
            });
          }
        });

        setManagersList(managers);
        setAllHalls(halls);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load managers and halls');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const availableHalls = selectedManager 
    ? allHalls.filter(hall => hall.managerId === selectedManager.id)
    : allHalls;

  const handleManagerChange = (manager: Manager | null) => {
    setSelectedManager(manager);
    setSelectedHall(null);
    setShowManagerModal(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  const handleWebDateChange = (type: 'start' | 'end', dateString: string) => {
    if (dateString) {
      const newDate = new Date(dateString);
      if (type === 'start') setStartDate(newDate);
      else setEndDate(newDate);
    }
  };

  const triggerWebDatePicker = (type: 'start' | 'end') => {
    if (type === 'start' && webStartInputRef.current) {
      webStartInputRef.current.showPicker(); 
    } else if (type === 'end' && webEndInputRef.current) {
      webEndInputRef.current.showPicker();
    }
  };

  const handleOpenPDF = async () => {
    try {
      if (Platform.OS === 'web') {
        if (pdfBlobRef.current) {
          const blobUrl = URL.createObjectURL(pdfBlobRef.current);
          window.open(blobUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } else {
          alert('PDF not available. Please generate report again.');
        }
      } else if (Platform.OS === 'ios') {
        if (pdfFileUri) {
          await Sharing.shareAsync(pdfFileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Open PDF with'
          });
        }
      } else {
        if (pdfFileUri) {
          const contentUri = await FileSystem.getContentUriAsync(pdfFileUri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: 'application/pdf'
          });
        }
      }
    } catch (error) {
      console.error('Open PDF error:', error);
      try {
        if (Platform.OS !== 'web' && pdfFileUri) {
          await Sharing.shareAsync(pdfFileUri);
        } else if (Platform.OS === 'web' && pdfBlobRef.current) {
          const blobUrl = URL.createObjectURL(pdfBlobRef.current);
          window.open(blobUrl, '_blank');
        }
      } catch (fallbackError) {
        if (Platform.OS === 'web') {
          alert('Failed to open PDF. Please try sharing instead.');
        } else {
          Alert.alert('Error', 'Failed to open PDF. Please try sharing instead.');
        }
      }
    }
  };

  const handleSharePDF = async () => {
    try {
      if (Platform.OS === 'web') {
        if (pdfBlobRef.current) {
          const blobUrl = URL.createObjectURL(pdfBlobRef.current);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `report_${formatDateForAPI(startDate)}_to_${formatDateForAPI(endDate)}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } else {
          alert('PDF not available. Please generate report again.');
        }
      } else {
        if (pdfFileUri) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(pdfFileUri, {
              dialogTitle: 'Share PDF with'
            });
          } else {
            Alert.alert('Error', 'Sharing is not available on this device');
          }
        }
      }
    } catch (error) {
      console.error('Share PDF error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to share PDF');
      } else {
        Alert.alert('Error', 'Failed to share PDF');
      }
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      const requestBody = {
        startDate: formatDateForAPI(startDate),
        endDate: formatDateForAPI(endDate),
        category: category,
        managerId: selectedManager ? selectedManager.id : 'all',
        hallId: selectedHall ? selectedHall.id : 'all'
      };

      console.log('Generating report with:', requestBody);

      const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      pdfBlobRef.current = blob;
      if (Platform.OS === 'web') {
        if (Platform.OS === 'web') {
          alert('Report Ready! PDF generated successfully.');
        }

      } else {
        const reader = new FileReader();

        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            const fileName = `report_${formatDateForAPI(startDate)}_to_${formatDateForAPI(endDate)}.pdf`;
            const fileUri = `${(FileSystem as any).cacheDirectory || 'file:///data/user/0/host.exp.exponent/cache/'}${fileName}`;

            await FileSystem.writeAsStringAsync(fileUri, base64data.split(',')[1], {
              encoding: 'base64'
            });

            setPdfFileUri(fileUri);
            console.log('PDF saved to:', fileUri);

          } catch (error) {
            console.error('File save error:', error);
            Alert.alert('Error', 'Failed to save PDF file. Please try again.');
          } finally {
            setIsGenerating(false);
          }
        };

        reader.readAsDataURL(blob);
      }
      if (Platform.OS === 'web') {
        const action = confirm('PDF generated! Click OK to Open PDF, Cancel to Download PDF');
        if (action) {
          handleOpenPDF();
        } else {
          handleSharePDF();
        }
        setIsGenerating(false);
      } else {
        Alert.alert(
          'Report Ready',
          'PDF report generated successfully. What would you like to do?',
          [
            {
              text: 'Open PDF',
              onPress: handleOpenPDF
            },
            {
              text: 'Share PDF',
              onPress: handleSharePDF
            },
            {
              text: 'Close',
              style: 'cancel',
              onPress: () => setIsGenerating(false)
            }
          ]
        );
      }

    } catch (error: any) {
      console.error('Report generation error:', error);
      if (Platform.OS === 'web') {
        alert(`Failed to generate report: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to generate report: ${error.message}`);
      }
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={Platform.OS === 'web' ? undefined : ['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.sectionLabel}>Report Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {(['All Categories', 'Events', 'Bookings', 'Requests'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Date Range</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBox} onPress={() => Platform.OS === 'web' ? triggerWebDatePicker('start') : setShowStartPicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          <Text style={styles.dateSeparator}>to</Text>
          <TouchableOpacity style={styles.dateBox} onPress={() => Platform.OS === 'web' ? triggerWebDatePicker('end') : setShowEndPicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text style={styles.dateText}>{formatDate(endDate)}</Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {Platform.OS === 'web' && (
          <div style={{ display: 'none' }}>
            <input
              ref={webStartInputRef}
              type="date"
              value={formatDateForAPI(startDate)}
              onChange={(e) => handleWebDateChange('start', e.target.value)}
            />
            <input
              ref={webEndInputRef}
              type="date"
              value={formatDateForAPI(endDate)}
              onChange={(e) => handleWebDateChange('end', e.target.value)}
            />
          </div>
        )}

        {Platform.OS !== 'web' && showStartPicker &&  (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartPicker(Platform.OS === 'ios');
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}
        {Platform.OS !== 'web' && showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndPicker(Platform.OS === 'ios');
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}

        <Text style={styles.sectionLabel}>Select Manager</Text>
        <TouchableOpacity style={styles.filterSelector} onPress={() => setShowManagerModal(true)}>
          <Ionicons name="person-outline" size={18} color="#6B7280" />
          <Text style={styles.filterSelectorText}>{selectedManager ? selectedManager.name : 'All Managers'}</Text>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Select Hall</Text>
        <TouchableOpacity style={styles.filterSelector} onPress={() => setShowHallModal(true)}>
          <Ionicons name="business-outline" size={18} color="#6B7280" />
          <Text style={styles.filterSelectorText}>{selectedHall ? selectedHall.name : 'All Halls'}</Text>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]} 
          onPress={handleGenerateReport}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="stats-chart" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.generateBtnText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showManagerModal} transparent animationType="slide" onRequestClose={() => setShowManagerModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowManagerModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Manager</Text>
            <TouchableOpacity 
              style={styles.modalItem}
              onPress={() => handleManagerChange(null)}
            >
              <Text style={[styles.modalItemText, !selectedManager && styles.modalItemTextActive]}>All Managers</Text>
              {!selectedManager && <Ionicons name="checkmark" size={20} color="#5B21B6" />}
            </TouchableOpacity>
            {managersList.map((manager) => (
              <TouchableOpacity 
                key={manager.id} 
                style={styles.modalItem}
                onPress={() => handleManagerChange(manager)}
              >
                <Text style={[styles.modalItemText, selectedManager?.id === manager.id && styles.modalItemTextActive]}>
                  {manager.name}
                </Text>
                {selectedManager?.id === manager.id && <Ionicons name="checkmark" size={20} color="#5B21B6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showHallModal} transparent animationType="slide" onRequestClose={() => setShowHallModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowHallModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Hall ({availableHalls.length} available)</Text>
            <TouchableOpacity 
              style={styles.modalItem}
              onPress={() => { setSelectedHall(null); setShowHallModal(false); }}
            >
              <Text style={[styles.modalItemText, !selectedHall && styles.modalItemTextActive]}>All Halls</Text>
              {!selectedHall && <Ionicons name="checkmark" size={20} color="#5B21B6" />}
            </TouchableOpacity>
            {availableHalls.map((hall) => (
              <TouchableOpacity 
                key={hall.id} 
                style={styles.modalItem}
                onPress={() => { setSelectedHall(hall); setShowHallModal(false); }}
              >
                <Text style={[styles.modalItemText, selectedHall?.id === hall.id && styles.modalItemTextActive]}>
                  {hall.name}
                </Text>
                {selectedHall?.id === hall.id && <Ionicons name="checkmark" size={20} color="#5B21B6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      <AdminBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryScroll: { marginBottom: 24 },
  categoryBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', marginRight: 12 },
  categoryBtnActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  categoryText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  categoryTextActive: { color: '#FFFFFF' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  dateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, gap: 10 },
  dateText: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  dateSeparator: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  filterSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, gap: 10, marginBottom: 24 },
  filterSelectorText: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  generateBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, marginBottom: 32 },
  generateBtnDisabled: { backgroundColor: '#A78BFA' },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  modalItemTextActive: { color: '#5B21B6', fontWeight: '700' },
});