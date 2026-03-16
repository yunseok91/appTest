import React, { useState } from 'react';
import {
  View, Modal, Image, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator, Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  uri: string | null;
  onClose: () => void;
}

export default function PhotoViewerModal({ uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const handleDownload = async () => {
    if (!uri) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 저장을 위해 갤러리 접근 권한이 필요합니다.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '사진이 갤러리에 저장되었습니다.');
    } catch {
      Alert.alert('오류', '사진 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!uri} animationType="fade" transparent={false} statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>
        {/* 닫기 버튼 */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 사진 */}
        {uri && (
          <Image
            source={{ uri }}
            style={styles.photo}
            resizeMode="contain"
          />
        )}

        {/* 하단 다운로드 버튼 */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.downloadBtn, saving && { opacity: 0.6 }]}
            onPress={handleDownload}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#fff" />
            )}
            <Text style={styles.downloadText}>{saving ? '저장 중...' : '갤러리에 저장'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 12,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 100,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  downloadText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
