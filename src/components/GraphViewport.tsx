import { Component } from 'react';

import { renderSvg, TypeGraph, Viewport } from './../graph/';
import LoadingAnimation from './utils/LoadingAnimation';
import { VoyagerDisplayOptions } from './Voyager';

interface GraphViewportProps {
  typeGraph: TypeGraph | null;
  displayOptions: VoyagerDisplayOptions;

  selectedTypeID: string | null;
  selectedEdgeID: string | null;

  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string) => void;
}

interface GraphViewportState {
  typeGraph: TypeGraph | null;
  displayOptions: VoyagerDisplayOptions | null;
  svgViewport: Viewport | null;
}

export default class GraphViewport extends Component<
  GraphViewportProps,
  GraphViewportState
> {
  state: GraphViewportState = {
    typeGraph: null,
    displayOptions: null,
    svgViewport: null,
  };

  // Handle async graph rendering based on this example
  // https://gist.github.com/bvaughn/982ab689a41097237f6e9860db7ca8d6
  _currentTypeGraph: TypeGraph | null = null;
  _currentDisplayOptions: VoyagerDisplayOptions | null = null;

  static getDerivedStateFromProps(
    props: GraphViewportProps,
    state: GraphViewportState,
  ): GraphViewportState | null {
    const { typeGraph, displayOptions } = props;

    if (
      typeGraph !== state.typeGraph ||
      displayOptions !== state.displayOptions
    ) {
      return { typeGraph, displayOptions, svgViewport: null };
    }

    return null;
  }

  componentDidMount() {
    const { typeGraph, displayOptions } = this.props;
    this._renderSvgAsync(typeGraph, displayOptions);
  }

  componentDidUpdate(
    prevProps: GraphViewportProps,
    prevState: GraphViewportState,
  ) {
    const { svgViewport } = this.state;

    if (svgViewport == null) {
      const { typeGraph, displayOptions } = this.props;
      this._renderSvgAsync(typeGraph, displayOptions);
      return;
    }

    const isJustRendered = prevState.svgViewport == null;
    const { selectedTypeID, selectedEdgeID } = this.props;

    if (prevProps.selectedTypeID !== selectedTypeID || isJustRendered) {
      svgViewport.selectNodeById(selectedTypeID);
    }

    if (prevProps.selectedEdgeID !== selectedEdgeID || isJustRendered) {
      svgViewport.selectEdgeById(selectedEdgeID);
    }
  }

  componentWillUnmount() {
    this._currentTypeGraph = null;
    this._currentDisplayOptions = null;
    this._cleanupSvgViewport();
  }

  _renderSvgAsync(
    typeGraph: TypeGraph | null,
    displayOptions: VoyagerDisplayOptions | null,
  ) {
    if (typeGraph == null || displayOptions == null) {
      return; // Nothing to render
    }

    if (
      typeGraph === this._currentTypeGraph &&
      displayOptions === this._currentDisplayOptions
    ) {
      return; // Already rendering in background
    }

    this._currentTypeGraph = typeGraph;
    this._currentDisplayOptions = displayOptions;

    const { onSelectNode, onSelectEdge } = this.props;
    renderSvg(typeGraph, displayOptions)
      .then((svg) => {
        if (
          typeGraph !== this._currentTypeGraph ||
          displayOptions !== this._currentDisplayOptions
        ) {
          return; // One of the past rendering jobs finished
        }

        this._cleanupSvgViewport();
        const containerRef = this.refs['viewport'] as HTMLElement;
        const svgViewport = new Viewport(
          svg,
          containerRef,
          onSelectNode,
          onSelectEdge,
        );
        this.setState({ svgViewport });
      })
      .catch((rawError) => {
        this._currentTypeGraph = null;
        this._currentDisplayOptions = null;

        const error =
          rawError instanceof Error
            ? rawError
            : new Error('Unknown error: ' + String(rawError));
        this.setState(() => {
          throw error;
        });
      });
  }

  render() {
    const isLoading = this.state.svgViewport == null;
    return (
      <>
        <div ref="viewport" className="viewport" />
        {isLoading && <LoadingAnimation />}
      </>
    );
  }

  resize() {
    const { svgViewport } = this.state;
    if (svgViewport) {
      svgViewport.resize();
    }
  }

  focusNode(id: string) {
    const { svgViewport } = this.state;
    if (svgViewport) {
      svgViewport.focusElement(id);
    }
  }

  _cleanupSvgViewport() {
    const { svgViewport } = this.state;
    if (svgViewport) {
      svgViewport.destroy();
    }
  }
}
