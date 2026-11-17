<template>
  <div class="custom-category">
    <el-tree
      style="width: 100%"
      :allow-drop="allowDrop"
      :allow-drag="allowDrag"
      :expand-on-click-node="false"
      :default-expanded-keys="expandNodeList"
      @node-expand="nodeExpand"
      @node-collapse="nodeCollapse"
      :data="dataSource"
      draggable
      node-key="id">
      <template #default="{ node, data }">
        <span class="custom-tree-node">
          <span>{{ node.label }}</span>
          <span class="node-actions">
            <a class="node-action" @click="confrimAppend(data)" v-if="data.level !== 2">
              {{ L10n.add_sub_category }}
            </a>

            <a
              class="node-action danger"
              @click="remove(node, data)"
              v-if="data.level !== 0">
              {{ L10n.delete }}
            </a>
            <a
              class="node-action"
              @click="confirmSave(node, data)"
              v-if="data.level === 0">
              {{ L10n.save }}
            </a>
            <a
              class="node-action"
              @click="confirmRestore()"
              v-if="data.level === 0">
              {{ L10n.recover }}
            </a>
            <a
              class="node-action"
              @click="confirmReDefault()"
              v-if="data.level === 0">
              {{ L10n.default }}
            </a>
          </span>
        </span>
      </template>
    </el-tree>
    <el-dialog
      v-model="addFormVisible"
      :title="L10n.add_sub_category"
      width="500">
      <el-input v-model="newCategory" autocomplete="off" />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addFormVisible = false">
            {{ L10n.cancel }}
          </el-button>
          <el-button type="primary" @click="append">
            {{ L10n.confirm }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    <el-dialog v-model="saveVisible" :title="L10n.custom_category" width="500">
      <span>{{ tipInfo }}</span>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="saveVisible = false">{{ L10n.cancel }}</el-button>
          <el-button type="primary" @click="handleTipAction">
            {{ L10n.confirm }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from "vue";
import type Node from "element-plus/es/components/tree/src/model/node";
import type { AllowDropType } from "element-plus/es/components/tree/src/tree.type";
import { getCategorySettingNode } from "./Manager";
import { CategorySettingNode } from "@/models/CategorySettingNode";
import { saveCustomCategory } from "@/utils/DataCenter";
import { ElMessage } from "element-plus";
import cloneDeep from "lodash/cloneDeep";
import L10n from "@/configs/L10n.json";
import { updateCurrentCategory } from "@/configs/CategoryParser";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
const addFormVisible = ref(false);
const saveVisible = ref(false);
const newCategory = ref("");
const currentSelectNode = ref<CategorySettingNode | null>(null);
const currentCustomCategory = ref<CategorySettingNode | null>(null);

const dataSource = ref<CategorySettingNode[]>([]);
let initSource: CategorySettingNode[];
let defaultSource: CategorySettingNode[];
const tipInfo = ref("");
const tipType = ref<"save" | "restore" | "default">("save");
const expandNodeList = ref<string[]>([L10n.all]);

async function loadCategory() {
  try {
    const data = await getCategorySettingNode("current");
    dataSource.value = data;
    initSource = cloneDeep(data);
    defaultSource = await getCategorySettingNode("default");
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

onMounted(() => {
  loadCategory();
  notifyCenter.on(NotifyType.CATEGORY_DATA_UPDATE, loadCategory);
});

onUnmounted(() => {
  notifyCenter.off(NotifyType.CATEGORY_DATA_UPDATE, loadCategory);
});

const handleTipAction = () => {
  if (tipType.value === "save") {
    save();
  } else if (tipType.value === "restore") {
    restore();
  } else {
    reDefault();
  }
};

const confrimAppend = (data: CategorySettingNode) => {
  currentSelectNode.value = data;
  addFormVisible.value = true;
};

const append = () => {
  if (!currentSelectNode.value) {
    return;
  }

  if (newCategory.value.length === 0) {
    ElMessage.error(L10n.input_category_name);
    return;
  }

  const data = currentSelectNode.value;

  if (data.children?.concat([]).find((d) => d.label === newCategory.value)) {
    ElMessage.error(L10n.input_already_exist);
    return;
  }

  const level = data.level + 1;
  const newChild = {
    id: newCategory.value,
    label: newCategory.value,
    level: level,
    children: [],
  };
  if (!data.children) {
    data.children = [];
  }
  data.children.push(newChild);
  dataSource.value = [...dataSource.value];
  currentSelectNode.value = null;
  addFormVisible.value = false;
  newCategory.value = "";
  ElMessage.success(L10n.add_success);
};

const confirmSave = (node: Node, data: CategorySettingNode) => {
  tipInfo.value = L10n.save_custom_category;
  tipType.value = "save";
  saveVisible.value = true;
  currentCustomCategory.value = data;
};

async function save() {
  if (currentCustomCategory.value) {
    try {
      await saveCustomCategory(currentCustomCategory.value);
      await updateCurrentCategory();
      ElMessage.success(L10n.save_success);
    } catch (error) {
      if (error instanceof Error) {
        ElMessage.error(error.message);
      } else {
        ElMessage.error(L10n.save_failed);
      }
    }
  }
  saveVisible.value = false;
  currentCustomCategory.value = null;
}

const confirmRestore = () => {
  tipInfo.value = L10n.recover_origin_category;
  tipType.value = "restore";
  saveVisible.value = true;
};

const restore = () => {
  dataSource.value = initSource;
  saveVisible.value = false;
  currentCustomCategory.value = null;
};

const confirmReDefault = () => {
  tipInfo.value = L10n.recover_system_category;
  tipType.value = "default";
  saveVisible.value = true;
};

const reDefault = () => {
  dataSource.value = defaultSource;
  saveVisible.value = false;
  currentCustomCategory.value = null;
};

const remove = (node: Node, data: CategorySettingNode) => {
  const parent = node.parent;
  const children: CategorySettingNode[] = parent.data.children || parent.data;
  const index = children.findIndex((d) => d.id === data.id);
  children.splice(index, 1);
  dataSource.value = [...dataSource.value];
};

function nodeExpand(data: CategorySettingNode) {
  if (expandNodeList.value.includes(data.id)) {
    return;
  }
  expandNodeList.value.push(data.id);
}

function nodeCollapse(data: CategorySettingNode) {
  const index = expandNodeList.value.findIndex((d) => d === data.id);
  expandNodeList.value.splice(index, 1);
  expandNodeList.value = [...expandNodeList.value];
}

const allowDrag = (draggingNode: Node) => {
  if (draggingNode.data.level === 0) {
    return false;
  }

  return true;
};

const allowDrop = (draggingNode: Node, dropNode: Node, type: AllowDropType) => {
  if (draggingNode.data.level < 0 || draggingNode.data.level > 2) {
    return false;
  }

  if (dropNode.data.level < 0 || dropNode.data.level > 2) {
    return false;
  }

  if (draggingNode.data.level === 1) {
    if (dropNode.data.level === 2) {
      return false;
    }
    if (type == "inner" && dropNode.data.level === 1) {
      return false;
    }
  }

  if (draggingNode.data.level === 2) {
    if (dropNode.data.level === 0) {
      return false;
    }
    if (dropNode.data.level === 1 && type !== "inner") {
      return false;
    }
    if (type == "inner" && dropNode.data.level === 2) {
      return false;
    }
  }

  return true;
};
</script>

<style>
.custom-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 12px;
  padding-right: 8px;
  font-size: 13px;
}

.node-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.custom-tree-node:hover .node-actions,
.custom-tree-node:focus-within .node-actions {
  opacity: 1;
  pointer-events: auto;
}

.node-action {
  font-size: 12px;
  color: #6c5dd3;
  cursor: pointer;
  white-space: nowrap;
}

.node-action:hover {
  text-decoration: underline;
}

.node-action.danger {
  color: #e2434f;
}

.custom-category {
  width: 100%;
  height: 100%;
  min-height: 360px;
  padding: 2px 6px 2px 0;
  overflow-y: auto;
}

.custom-category .el-tree {
  padding: 2px 0;
  background: transparent;
}


.custom-category .el-tree-node__content {
  height: 32px;
  border-radius: 6px;
}

.custom-category .el-tree-node__content:hover {
  background-color: #f6f5fb;
}
</style>
