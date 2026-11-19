<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? L10n.edit_bank : L10n.add_bank"
    width="460"
    align-center
    @update:model-value="close">
    <el-form label-width="84px">
      <el-form-item :label="L10n.bank_name">
        <el-input
          v-model="form.name"
          :placeholder="L10n.bank_name_placeholder"
          clearable />
      </el-form-item>
      <div class="custom-tip">{{ L10n.custom_bank_tip }}</div>
    </el-form>

    <template #footer>
      <div class="bank-footer">
        <el-button
          v-if="isEdit"
          type="danger"
          text
          :loading="deleting"
          @click="removeBank">
          {{ L10n.delete }}
        </el-button>
        <span class="footer-spacer"></span>
        <el-button @click="close">{{ L10n.cancel }}</el-button>
        <el-button type="primary" :loading="saving" @click="save">
          {{ L10n.save }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch, defineProps, defineEmits } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import L10n from "@/configs/L10n.json";
import { DepositBank } from "@/models/Deposit";
import { presetByName } from "@/configs/BankPresets";
import { createBank, deleteBank, updateBank } from "@/utils/DataCenter";


const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bank: { type: Object as () => DepositBank | null, default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const isEdit = computed(() => !!props.bank?.id);
const form = ref<DepositBank>({ id: 0, name: "", icon: "" });
const saving = ref(false);
const deleting = ref(false);

watch(
  () => props.modelValue,
  (value) => {
    if (!value) {
      return;
    }
    if (props.bank) {
      form.value = { ...props.bank };
    } else {
      form.value = { id: 0, name: "", icon: "" };
    }
  },
  { immediate: true }
);

function close() {
  emit("update:modelValue", false);
}

async function save() {
  const name = form.value.name.trim();
  if (!name) {
    ElMessage.warning(L10n.bank_name_placeholder);
    return;
  }
  if (presetByName(name)) {
    ElMessage.warning(L10n.bank_exists_in_package);
    return;
  }
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateBank({ ...form.value, name, icon: form.value.icon || "" });
    } else {
      await createBank({ id: 0, name, icon: "" });
    }
    ElMessage.success(isEdit.value ? L10n.bank_updated : L10n.bank_added);
    emit("saved");
    close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : L10n.system_error);
  } finally {
    saving.value = false;
  }
}

async function removeBank() {
  if (!props.bank?.id) {
    return;
  }
  try {
    await ElMessageBox.confirm(L10n.confirm_delete_bank, L10n.delete, {
      confirmButtonText: L10n.confirm,
      cancelButtonText: L10n.cancel,
      type: "warning",
    });
    deleting.value = true;
    await deleteBank(props.bank.id);
    ElMessage.success(L10n.bank_deleted);
    emit("saved");
    close();
  } catch (error) {
    if (error !== "cancel" && error !== "close" && error instanceof Error) {
      ElMessage.error(error.message);
    }
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.custom-tip {
  margin: -6px 0 14px 84px;
  font-size: 11px;
  color: #9aa0ad;
}

.bank-footer {
  display: flex;
  align-items: center;
  width: 100%;
}

.footer-spacer {
  flex: 1;
}
</style>
