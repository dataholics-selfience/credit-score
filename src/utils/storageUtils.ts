/**
 * Utilitários para upload otimizado no Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export interface UploadConfig {
  maxFileSize: number;
  maxRetries: number;
  retryDelay: number;
  allowedTypes: string[];
}

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
};

/**
 * Valida arquivo antes do upload
 */
export function validateFile(file: File, config: UploadConfig = DEFAULT_UPLOAD_CONFIG): {
  isValid: boolean;
  error?: string;
} {
  // Verificar tipo de arquivo
  if (!config.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Tipo de arquivo não permitido. Aceitos: ${config.allowedTypes.join(', ')}`
    };
  }

  // Verificar tamanho
  if (file.size > config.maxFileSize) {
    const maxSizeMB = (config.maxFileSize / 1024 / 1024).toFixed(1);
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      isValid: false,
      error: `Arquivo muito grande (${fileSizeMB}MB). Máximo permitido: ${maxSizeMB}MB`
    };
  }

  return { isValid: true };
}

/**
 * Upload com retry automático e tratamento de erros
 */
export async function uploadFileWithRetry(
  file: File,
  path: string,
  config: UploadConfig = DEFAULT_UPLOAD_CONFIG,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validar arquivo primeiro
  const validation = validateFile(file, config);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/${config.maxRetries} de upload: ${file.name}`);
      
      if (onProgress) {
        onProgress(10); // Início do upload
      }
      
      const storageRef = ref(storage, path);
      
      // Simular progresso durante upload
      let progressInterval: NodeJS.Timeout | null = null;
      if (onProgress) {
        let currentProgress = 10;
        progressInterval = setInterval(() => {
          currentProgress = Math.min(90, currentProgress + Math.random() * 20);
          onProgress(currentProgress);
        }, 500);
      }
      
      try {
        const snapshot = await uploadBytes(storageRef, file);
        
        if (progressInterval) {
          clearInterval(progressInterval);
          onProgress?.(95);
        }
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        if (onProgress) {
          onProgress(100);
        }
        
        console.log(`✅ Upload bem-sucedido na tentativa ${attempt}: ${file.name}`);
        return downloadURL;
        
      } catch (error) {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        throw error;
      }
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Tentativa ${attempt} falhou para ${file.name}:`, error);
      
      if (onProgress) {
        onProgress(0); // Reset progress on error
      }
      
      // Se não é a última tentativa, aguardar antes de tentar novamente
      if (attempt < config.maxRetries) {
        const delay = config.retryDelay * attempt; // Delay progressivo
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  const errorMessage = getStorageErrorMessage(lastError);
  throw new Error(`Upload falhou após ${config.maxRetries} tentativas: ${errorMessage}`);
}

/**
 * Converte erros do Firebase Storage em mensagens amigáveis
 */
export function getStorageErrorMessage(error: Error | null): string {
  if (!error) return 'Erro desconhecido';
  
  const errorCode = error.message;
  
  if (errorCode.includes('storage/retry-limit-exceeded')) {
    return 'Timeout no upload. Verifique sua conexão de internet e tente novamente.';
  }
  
  if (errorCode.includes('storage/unauthorized')) {
    return 'Erro de autorização. Faça login novamente.';
  }
  
  if (errorCode.includes('storage/canceled')) {
    return 'Upload cancelado pelo usuário.';
  }
  
  if (errorCode.includes('storage/unknown')) {
    return 'Erro interno do servidor. Tente novamente em alguns minutos.';
  }
  
  if (errorCode.includes('storage/invalid-format')) {
    return 'Formato de arquivo inválido.';
  }
  
  if (errorCode.includes('storage/invalid-event-name')) {
    return 'Erro na configuração do upload.';
  }
  
  if (errorCode.includes('storage/invalid-url')) {
    return 'URL de upload inválida.';
  }
  
  if (errorCode.includes('storage/invalid-argument')) {
    return 'Parâmetros de upload inválidos.';
  }
  
  if (errorCode.includes('storage/no-default-bucket')) {
    return 'Configuração de storage não encontrada.';
  }
  
  if (errorCode.includes('storage/cannot-slice-blob')) {
    return 'Erro ao processar o arquivo. Tente um arquivo menor.';
  }
  
  if (errorCode.includes('storage/server-file-wrong-size')) {
    return 'Tamanho do arquivo inconsistente. Tente novamente.';
  }
  
  // Erros de rede
  if (errorCode.includes('network') || errorCode.includes('timeout')) {
    return 'Problema de conexão. Verifique sua internet e tente novamente.';
  }
  
  // Retornar mensagem original se não reconhecido
  return error.message || 'Erro desconhecido no upload';
}

/**
 * Upload múltiplos arquivos com controle individual de progresso
 */
export async function uploadMultipleFiles(
  files: File[],
  basePath: string,
  config: UploadConfig = DEFAULT_UPLOAD_CONFIG,
  onFileProgress?: (fileIndex: number, progress: number) => void,
  onOverallProgress?: (progress: number) => void
): Promise<string[]> {
  const results: string[] = [];
  const totalFiles = files.length;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = `${basePath}/${Date.now()}_${i}_${file.name}`;
    
    try {
      const downloadURL = await uploadFileWithRetry(
        file,
        filePath,
        config,
        (progress) => {
          onFileProgress?.(i, progress);
          
          // Calcular progresso geral
          if (onOverallProgress) {
            const completedFiles = i;
            const currentFileProgress = progress / 100;
            const overallProgress = ((completedFiles + currentFileProgress) / totalFiles) * 100;
            onOverallProgress(Math.round(overallProgress));
          }
        }
      );
      
      results.push(downloadURL);
      console.log(`✅ Arquivo ${i + 1}/${totalFiles} enviado: ${file.name}`);
      
    } catch (error) {
      console.error(`❌ Falha no upload do arquivo ${file.name}:`, error);
      throw new Error(`Falha no upload de "${file.name}": ${getStorageErrorMessage(error as Error)}`);
    }
  }
  
  return results;
}

/**
 * Comprime arquivo se necessário (para imagens)
 */
export async function compressImageIfNeeded(
  file: File,
  maxSizeKB: number = 1024,
  quality: number = 0.8
): Promise<File> {
  // Só comprimir imagens
  if (!file.type.startsWith('image/')) {
    return file;
  }
  
  // Se já está no tamanho adequado, retornar original
  if (file.size <= maxSizeKB * 1024) {
    return file;
  }
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calcular dimensões mantendo proporção
      const maxDimension = 1920; // Max width/height
      let { width, height } = img;
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Converter para blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Falha na compressão da imagem'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Falha ao carregar imagem para compressão'));
    img.src = URL.createObjectURL(file);
  });
}