import { useState, useEffect } from 'react';

// 全局状态管理
class GlobalState {
  private state: any = {};
  private listeners: Set<Function> = new Set();

  setState(newState: any) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }

  getState() {
    return this.state;
  }

  subscribe(listener: Function) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

const globalState = new GlobalState();

// useModel hook
export function useModel(namespace: string) {
  const [state, setState] = useState(globalState.getState());

  useEffect(() => {
    const unsubscribe = globalState.subscribe(setState);
    return unsubscribe;
  }, []);

  const setInitialState = (newState: any) => {
    globalState.setState(newState);
  };

  if (namespace === '@@initialState') {
    return {
      initialState: state,
      setInitialState,
    };
  }

  return state;
}

// 导出全局状态实例
export { globalState };
