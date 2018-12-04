/* eslint-disable import/no-unresolved, import/extensions */

import React, { Component } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewPropTypes,
} from 'react-native';
import _ from 'lodash';
import PropTypes from 'prop-types';

const SCREEN_WIDTH = Dimensions.get('window').width;

const SwipeDirections = {
  RIGHT: 'RIGHT',
  LEFT: 'LEFT',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    alignSelf: 'stretch',
  },
  cardContainer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  swipedAllContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default class CardSwiper extends Component {
  static propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.any.isRequired,
    })).isRequired,
    cardIndex: PropTypes.number,

    renderCard: PropTypes.func.isRequired,
    renderSwipedAll: PropTypes.func,

    onSwipeRight: PropTypes.func,
    onSwipeLeft: PropTypes.func,
    onSwipeAll: PropTypes.func,

    swipeThresholdDistanceFactor: PropTypes.number,
    swipeOutDuration: PropTypes.number,
    preloadCards: PropTypes.number,

    containerStyle: ViewPropTypes.style,
    enableFillContainer: PropTypes.bool,
  };

  static defaultProps = {
    data: [],
    cardIndex: undefined,

    renderSwipedAll: undefined,

    onSwipeRight: ({ cardIndex, item }) => ({ cardIndex, item }),
    onSwipeLeft: ({ cardIndex, item }) => ({ cardIndex, item }),
    onSwipeAll: () => null,

    swipeThresholdDistanceFactor: 0.25,
    swipeOutDuration: 150,
    preloadCards: 3,

    containerStyle: undefined,
    enableFillContainer: false,
  };

  state = {
    currentCardIndex: this.props.cardIndex || 0,
    panResponder: {},
    contentContainerLayout: {},
    cardLayout: {},
  };

  swipeCardAnimatedPosition = new Animated.ValueXY();

  componentWillReceiveProps(nextProps) {
    this.handleReceiveNewCardIndex(nextProps);
  }

  handleReceiveNewCardIndex = (nextProps) => {
    if (
      nextProps.cardIndex !== undefined &&
      nextProps.cardIndex !== this.state.currentCardIndex
    ) {
      this.setState({ currentCardIndex: nextProps.cardIndex });
    }
  };

  initPanResponder = (swipeThresholdDistanceBase) => {
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        this.swipeCardAnimatedPosition.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (event, gesture) => {
        // TODO: add swipeThresholdSpeedFactor
        const { swipeThresholdDistanceFactor } = this.props;
        if (gesture.dx > swipeThresholdDistanceFactor * swipeThresholdDistanceBase) {
          this.forceSwipe(SwipeDirections.RIGHT);
        } else if (gesture.dx < -swipeThresholdDistanceFactor * swipeThresholdDistanceBase) {
          this.forceSwipe(SwipeDirections.LEFT);
        } else {
          this.resetCardPosition();
        }
      },
    });
    this.setState({ panResponder });
  };

  swipeRight = (swipeMethodProps) => {
    this.forceSwipe(SwipeDirections.RIGHT, swipeMethodProps);
  };

  swipeLeft = (swipeMethodProps) => {
    this.forceSwipe(SwipeDirections.LEFT, swipeMethodProps);
  };

  forceSwipe = (direction, swipeMethodProps) => {
    const { swipeOutDuration } = this.props;
    let targetPositionX;
    switch (direction) {
      case SwipeDirections.RIGHT: {
        targetPositionX = SCREEN_WIDTH;
        break;
      }
      case SwipeDirections.LEFT: {
        targetPositionX = -SCREEN_WIDTH;
        break;
      }
      default:
        break;
    }

    Animated.timing(this.swipeCardAnimatedPosition, {
      toValue: { x: targetPositionX, y: 0 },
      duration: swipeOutDuration,
    }).start(() => this.handleSwipeComplete(direction, swipeMethodProps));
  };

  handleSwipeComplete = (direction, swipeMethodProps) => {
    const { onSwipeLeft, onSwipeRight, data } = this.props;
    const { currentCardIndex } = this.state;
    const item = data[currentCardIndex];

    this.swipeCardAnimatedPosition.setValue({ x: 0, y: 0 });
    this.setState({ currentCardIndex: currentCardIndex + 1 }, () => {
      switch (direction) {
        case SwipeDirections.RIGHT:
          onSwipeRight({ cardIndex: currentCardIndex, item, swipeMethodProps });
          break;
        case SwipeDirections.LEFT:
          onSwipeLeft({ cardIndex: currentCardIndex, item, swipeMethodProps });
          break;
        default:
      }
    });
  };

  resetCardPosition = () => {
    Animated.spring(this.swipeCardAnimatedPosition, {
      toValue: { x: 0, y: 0 },
    }).start();
  };

  updateContentContainerLayout = ({ nativeEvent }) => {
    const { contentContainerLayout } = this.state;
    if (
      contentContainerLayout.height !== nativeEvent.layout.height ||
      contentContainerLayout.width !== nativeEvent.layout.width
    ) {
      this.setState({ contentContainerLayout: nativeEvent.layout }, () => {
        this.initPanResponder(nativeEvent.layout.width);
      });
    }
  };

  updateCardLayout = ({ nativeEvent }) => {
    const { cardLayout } = this.state;
    if (
      cardLayout.height !== nativeEvent.layout.height ||
      cardLayout.width !== nativeEvent.layout.width
    ) {
      this.setState({ cardLayout: nativeEvent.layout });
    }
  };

  getCardLayoutStyles = () => {
    const { contentContainerLayout } = this.state;
    const { enableFillContainer } = this.props;

    return {
      width: contentContainerLayout.width,
      height: enableFillContainer ? contentContainerLayout.height : undefined,
    };
  };

  getCardAnimatedStyles = () => {
    // TODO: make this basing on both position.x and position.y
    const rotate = this.swipeCardAnimatedPosition.x.interpolate({
      // TODO: make this a props
      inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      outputRange: ['-30deg', '0deg', '30deg'],
    });

    return ({
      ...this.swipeCardAnimatedPosition.getLayout(),
      transform: [{ rotate }],
    });
  };

  getBackgroundCardAnimatedStyles = (i) => {
    if (i === this.state.currentCardIndex + 1) {
      // TODO: make this basing on both position.x and position.y
      const scale = this.swipeCardAnimatedPosition.x.interpolate({
        // TODO: make this a props
        inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        outputRange: [1, 0.95, 1],
      });
      return ({ transform: [{ scale }] });
    }
    return ({ opacity: 0 });
  };

  renderSwipedAll = () => (this.props.renderSwipedAll ? this.props.renderSwipedAll() : (
    <View style={styles.swipedAllContainer}>
      <Text>No more cards</Text>
    </View>
  ));

  renderCards = () => {
    const { currentCardIndex, panResponder, contentContainerLayout } = this.state;
    const { data, renderCard, preloadCards, onSwipeAll } = this.props;

    // NOTE: Don't render cards until card layout style is available
    // from contentContainerLayout to prevent flickering.
    if (_.isEmpty(contentContainerLayout)) {
      return null;
    }

    if (currentCardIndex >= data.length) {
      onSwipeAll();
      return this.renderSwipedAll();
    }

    return data.map((item, i) => {
      if (i < currentCardIndex) {
        return null;
      } else if (i === currentCardIndex) {
        return (
          <Animated.View
            key={`react-native-card-swiper-card-${i}`} // eslint-disable-line react/no-array-index-key
            onLayout={this.updateCardLayout}
            style={[
              styles.cardContainer,
              this.getCardLayoutStyles(),
              this.getCardAnimatedStyles(),
              { zIndex: 99 },
            ]}
            {...panResponder.panHandlers}
          >
            {renderCard(item)}
          </Animated.View>
        );
      } else if (i < currentCardIndex + preloadCards) {
        return (
          <Animated.View
            key={`react-native-card-swiper-card-${i}`} // eslint-disable-line react/no-array-index-key
            style={[
              styles.cardContainer,
              this.getCardLayoutStyles(),
              this.getBackgroundCardAnimatedStyles(i),
            ]}
          >
            {renderCard(item)}
          </Animated.View>
        );
      }
      return null;
    }).reverse();
  };

  render() {
    const { containerStyle, enableFillContainer } = this.props;
    const { cardLayout } = this.state;

    let contentContainerLayoutStyle;
    let contentContainerOpacity;
    if (enableFillContainer) {
      contentContainerLayoutStyle = { flex: 1 };
      contentContainerOpacity = undefined;
    } else {
      contentContainerLayoutStyle = { height: cardLayout.height };
      // NOTE: hide contentContainer before cardLayout.height is ready to prevent flickering.
      contentContainerOpacity = cardLayout.height ? 1 : 0;
    }

    return (
      <View style={[styles.container, containerStyle]}>
        <View
          style={[
            styles.contentContainer,
            contentContainerLayoutStyle,
            { opacity: contentContainerOpacity },
          ]}
          onLayout={this.updateContentContainerLayout}
        >
          {this.renderCards()}
        </View>
      </View>
    );
  }
}
