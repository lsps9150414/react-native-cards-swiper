import _ from 'lodash';
import PropTypes from 'prop-types';
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

const SCREEN_WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
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
  };

  static defaultProps = {
    data: [],
    cardIndex: undefined,

    renderSwipedAll: undefined,

    onSwipeRight: item => item,
    onSwipeLeft: item => item,
    onSwipeAll: () => null,

    swipeThresholdDistanceFactor: 0.25,
    swipeOutDuration: 150,
    preloadCards: 3,

    containerStyle: undefined,
  };

  constructor(props) {
    super(props);
    this.swipeCardAnimatedPosition = new Animated.ValueXY();

    this.state = {
      currentCardIndex: props.cardIndex || 0,
      panResponder: {},
      contentContainerLayout: {},
    };
  }

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
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        this.swipeCardAnimatedPosition.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (event, gesture) => {
        // TODO: add swipeThresholdSpeedFactor
        const { swipeThresholdDistanceFactor } = this.props;
        if (gesture.dx > swipeThresholdDistanceFactor * swipeThresholdDistanceBase) {
          this.forceSwipe('right');
        } else if (gesture.dx < -swipeThresholdDistanceFactor * swipeThresholdDistanceBase) {
          this.forceSwipe('left');
        } else {
          this.resetCardPosition();
        }
      },
    });
    this.setState({ panResponder });
  };

  swipeRight = () => {
    this.forceSwipe('right');
  };

  swipeLeft = () => {
    this.forceSwipe('left');
  };

  forceSwipe = (direction) => {
    const { swipeOutDuration } = this.props;
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;

    Animated.timing(this.swipeCardAnimatedPosition, {
      toValue: { x, y: 0 },
      duration: swipeOutDuration,
    }).start(() => this.handleSwipeComplete(direction));
  };

  handleSwipeComplete = (direction) => {
    const { onSwipeLeft, onSwipeRight, data } = this.props;
    const item = data[this.state.currentCardIndex];

    this.swipeCardAnimatedPosition.setValue({ x: 0, y: 0 });
    this.setState({ currentCardIndex: this.state.currentCardIndex + 1 }, () => {
      switch (direction) {
        case 'right':
          onSwipeRight(item);
          break;
        case 'left':
          onSwipeLeft(item);
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

  getCardLayoutStyles = () => {
    const { contentContainerLayout } = this.state;

    return {
      width: contentContainerLayout.width,
      height: contentContainerLayout.height,
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
    const { containerStyle } = this.props;

    return (
      <View style={[styles.container, containerStyle]}>
        <View
          style={[styles.contentContainer]}
          onLayout={this.updateContentContainerLayout}
        >
          {this.renderCards()}
        </View>
      </View>
    );
  }
}
