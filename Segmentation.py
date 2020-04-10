import os
import sys
import random
import warnings
import numpy as np
import matplotlib.pyplot as plt
from tqdm import tqdm
from PIL import Image
import glob
import cv2
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.layers import Input
from tensorflow.keras.layers import Activation, BatchNormalization
from tensorflow.keras.layers import Dropout, Lambda
from tensorflow.keras.layers import Conv2D, Conv2DTranspose
from tensorflow.keras.layers import MaxPooling2D
from tensorflow.keras.layers import concatenate
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras import backend as K
from tensorflow.keras.callbacks import CSVLogger
from tensorflow.keras.optimizers import Adam
import tensorflow as tf

img_width = 512
img_height = 512
num_channel = 3
num_separate = 2
# img_pathes= sys.stdin.readline().replace("\n","").split(",")
img_dir = "public/image/"
mask_dir="public/maskFromUnet/"
img_pathes= os.listdir(img_dir)
already_processed = [os.path.basename(path_with_dir) for path_with_dir in glob.glob(mask_dir+"*png")]
process_img_pathes = []
for img_path in img_pathes:
    if not (os.path.basename(img_path).replace("jpg", "png") in already_processed):
        process_img_pathes.append(img_path)
print(len(process_img_pathes), "IMAGES WILL BE PROCOSSED......")
# print(len(already_processed))


# Define IoU metric
def mean_iou(y_true, y_pred):
    prec = []
    for t in np.arange(0.5, 1.0, 0.05):
        y_pred_ = tf.to_int32(y_pred > t)
        score, up_opt = tf.metrics.mean_iou(y_true, y_pred_, 2)
        K.get_session().run(tf.local_variables_initializer())
        with tf.control_dependencies([up_opt]):
            score = tf.identity(score)
        prec.append(score)
    return K.mean(K.stack(prec), axis=0)


#Define Loss
def dice_coeff(y_true, y_pred):
    smooth = 1.
    # Flatten
    y_true_f = tf.reshape(y_true, [-1])
    y_pred_f = tf.reshape(y_pred, [-1])
    intersection = tf.reduce_sum(y_true_f * y_pred_f)
    score = (2. * intersection + smooth) / (tf.reduce_sum(y_true_f) + tf.reduce_sum(y_pred_f) + smooth)
    return score

def dice_loss(y_true, y_pred):
    loss = 1 - dice_coeff(y_true, y_pred)
    return loss


if len(process_img_pathes)>0:
    # #Load Pretrained Model

    X = np.zeros((num_separate*num_separate*len(process_img_pathes), img_height, img_width, num_channel), dtype=np.uint8)
    m=0
    print("PREPROCESSING IMAGE......")
    for process_img_path in tqdm(process_img_pathes):
        img_org=Image.open(img_dir+process_img_path).convert("RGB")
        img_org=img_org.resize((num_separate*img_width, num_separate*img_height))
        img_org=np.array(img_org)
        p=0
        q=0
        for p in range(num_separate):
          for q in range(num_separate):
            X[m]=img_org[p*img_width:(p+1)*img_width,q*img_height:(q+1)*img_height,:]
            m=m+1

    model_path='model.h5'
    model = load_model(model_path, custom_objects={'mean_iou': mean_iou, 'dice_loss': dice_loss})

    print("LOADING PRETRAINED MODEL......")
    predictions=model.predict(X, verbose=1)
    predictions_t=(predictions > 0.5).astype(np.uint8)


    o=0
    i=0
    print("GENERATING MASK IMAGE......")
    for i in  tqdm(range(len(process_img_pathes))):
        p=0
        q=0
        for p in range(num_separate):
            for q in range(num_separate):
                if (q==0):
                    PRED=predictions_t[o]
                else:
                    PRED=np.hstack((PRED, predictions_t[o]))
                o=o+1
            if (p==0):
                PREDS_=PRED
            else:
                PREDS_=np.vstack((PREDS_, PRED))
        alpha=128
        img_RGBA=Image.fromarray(np.uint8(PREDS_[:,:,0]*255)).convert("RGBA")
        img_array=np.array(img_RGBA)
        background_bool=img_array[:,:,0]>0
        img_array[:,:,3]=255*0.3
        img_array[background_bool,3]=0
        img_array=np.array(img_array, dtype="float64")
        Image.fromarray(np.uint8(img_array)).save(mask_dir+process_img_pathes[i].replace("jpg", "png"))
