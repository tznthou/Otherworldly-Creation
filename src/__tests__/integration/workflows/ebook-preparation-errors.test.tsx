import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import ChapterConfigurationPanel from '../../../renderer/src/components/AI/VisualCreation/EbookPreparation/components/ChapterConfigurationPanel';
import { IllustrationHistoryItem } from '../../../renderer/src/types/illustration';

/**
 * 電子書排版設定的失敗路徑是否對使用者可見。
 *
 * useEbookPreparationPersistence 有三處 dispatch(setError)，但在此之前
 * 全 repo 沒有任何元件讀 state.ebookPreparation.error —— 程式碼裡不再靜默，
 * 畫面上依然靜默。這組測試驗的就是「失敗看得見」這件事本身。
 *
 * 資料流：chapters / projects 由父層載入後放進 store，本元件只讀不 fetch，
 * 因此用 preloadedState 餵。localStorage 走 setup-env.ts 的真實行為替身。
 */

const STORAGE_KEY = 'genesis-chronicle-ebook-preparation';
const QUARANTINE_KEY = 'genesis-chronicle-ebook-preparation-quarantine';

const PROJECT_ID = 'project-A';
const CHAPTER_ID = 'chapter-1';
const IMAGE_ID = 'image-1';

const createImage = (overrides: Partial<IllustrationHistoryItem> = {}): IllustrationHistoryItem => ({
  id: IMAGE_ID,
  original_prompt: '一隻在屋頂上的貓',
  model: 'flux',
  width: 1024,
  height: 768,
  enhance: false,
  status: 'completed',
  created_at: '2026-08-05T00:00:00Z',
  is_favorite: false,
  provider: 'pollinations',
  is_free: true,
  is_confirmed: true,
  ...overrides,
});

const preloadedState = {
  projects: {
    projects: [],
    currentProject: {
      id: PROJECT_ID,
      name: '測試專案',
      description: '',
      type: 'isekai',
      createdAt: '2026-08-05T00:00:00Z',
      updatedAt: '2026-08-05T00:00:00Z',
    },
    loading: false,
    error: null,
  },
  chapters: {
    chapters: [
      {
        id: CHAPTER_ID,
        projectId: PROJECT_ID,
        title: '第一章',
        content: [],
        order: 1,
        createdAt: '2026-08-05T00:00:00Z',
        updatedAt: '2026-08-05T00:00:00Z',
      },
    ],
    currentChapter: null,
    loading: false,
    saving: false,
    error: null,
    lastSaved: null,
  },
};

/** 一份合法且已分配圖片的配置，用來讓「保存配置」按鈕脫離 disabled */
const validConfig = (projectId: string) => ({
  projectId,
  bookTitle: '測試書名',
  bookAuthor: '測試作者',
  imageCategories: [],
  chapterConfigurations: [
    {
      chapterId: CHAPTER_ID,
      chapterTitle: '第一章',
      chapterNumber: 1,
      images: [{ position: 'chapter_header', imageId: IMAGE_ID, order: 0 }],
    },
  ],
  createdAt: '2026-08-05T00:00:00Z',
  updatedAt: '2026-08-05T00:00:00Z',
});

const renderPanel = () =>
  renderWithProviders(
    <ChapterConfigurationPanel selectedImages={[createImage()]} projectId={PROJECT_ID} />,
    { preloadedState }
  );

/** 讓寫入指定 key 時丟出配額用盡，其餘 key 維持真實行為 */
const failWritesTo = (targetKey: string) => {
  const setItem = localStorage.setItem as jest.Mock;
  const passthrough = setItem.getMockImplementation()!;

  setItem.mockImplementation((key: string, value: string) => {
    if (key === targetKey) {
      throw new DOMException('儲存空間不足', 'QuotaExceededError');
    }
    return passthrough(key, value);
  });
};

describe('電子書排版設定的失敗路徑對使用者可見', () => {
  let restoreSetItem: () => void;

  beforeEach(() => {
    localStorage.clear();
    const setItem = localStorage.setItem as jest.Mock;
    const original = setItem.getMockImplementation()!;
    restoreSetItem = () => setItem.mockImplementation(original);
  });

  afterEach(() => {
    restoreSetItem();
  });

  it('歸屬錯位的設定被隔離後，畫面告知使用者設定已被移走', async () => {
    // 歷史上錯位寫入：project-A 的槽位裡放著 project-B 的設定
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [PROJECT_ID]: validConfig('project-B') })
    );

    renderPanel();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/隔離區/);
    expect(alert).toHaveTextContent(/project-B/);

    // 隔離成功時設定確實被搬走了，配置介面應照常可用
    expect(screen.getByRole('heading', { name: /未分配圖片/ })).toBeInTheDocument();
  });

  it('隔離失敗時停用配置介面，並提供重試路徑', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [PROJECT_ID]: validConfig('project-B') })
    );
    failWritesTo(QUARANTINE_KEY);

    renderPanel();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/無法移至隔離區/);

    // 載入被擋住時 currentConfig 是 null，拖放進去只會靜默 no-op。
    // 照常渲染拖放介面等於邀請使用者做白工。
    expect(screen.queryByRole('heading', { name: /未分配圖片/ })).not.toBeInTheDocument();

    // 使用者清掉儲存空間後要有辦法回到正常流程，而不是只能重開 App
    expect(screen.getByRole('button', { name: /重試/ })).toBeInTheDocument();
  });

  it('手動儲存失敗時畫面回報失敗，不會讓使用者以為存檔完成', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [PROJECT_ID]: validConfig(PROJECT_ID) })
    );

    renderPanel();

    const saveButton = await screen.findByRole('button', { name: '保存配置' });
    await waitFor(() => expect(saveButton).toBeEnabled());

    failWritesTo(STORAGE_KEY);
    act(() => { fireEvent.click(saveButton); });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/儲存失敗/);
  });

  it('手動儲存成功時畫面給出成功回饋', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [PROJECT_ID]: validConfig(PROJECT_ID) })
    );

    renderPanel();

    const saveButton = await screen.findByRole('button', { name: '保存配置' });
    await waitFor(() => expect(saveButton).toBeEnabled());

    act(() => { fireEvent.click(saveButton); });

    expect(await screen.findByRole('status')).toHaveTextContent(/已儲存/);
  });

  it('錯誤訊息可由使用者關閉', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [PROJECT_ID]: validConfig('project-B') })
    );

    renderPanel();

    await screen.findByRole('alert');
    act(() => { fireEvent.click(screen.getByRole('button', { name: /關閉提示/ })); });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
